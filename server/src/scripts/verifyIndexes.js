/**
 * Safe Production Index Verification & Synchronization Script
 * Mahadev Mechanical Car Garage
 *
 * Verifies all required unique and compound indexes across all 21 Mongoose models.
 * Builds any missing indexes safely without destructive drops.
 *
 * Usage:
 *   node src/scripts/verifyIndexes.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB, disconnectDB, isTransactionSupported } from '../config/db.js';
import * as models from '../models/index.js';
import { logger } from '../utils/logger.js';

dotenv.config();

const MANDATORY_UNIQUE_CONSTRAINTS = [
  { model: 'User', fields: ['email'], description: 'User unique email identifier' },
  { model: 'Customer', fields: ['mobileNumber'], description: 'Customer normalized mobile number' },
  { model: 'Vehicle', fields: ['registrationNumberClean'], description: 'Vehicle registration number (partial unique)' },
  { model: 'Appointment', fields: ['bookingReference'], description: 'Appointment booking reference' },
  { model: 'Appointment', fields: ['idempotencyKey'], description: 'Appointment idempotency key' },
  { model: 'JobCard', fields: ['jobCardNumber'], description: 'Job Card number' },
  { model: 'JobCard', fields: ['appointmentId'], description: 'Job Card appointment reference (partial unique)' },
  { model: 'ServiceEstimate', fields: ['estimateNumber', 'versionNumber'], description: 'Estimate number and version constraints' },
  { model: 'ServiceEstimate', fields: ['jobCardId', 'versionNumber'], description: 'Estimate version uniqueness per Job Card' },
  { model: 'Invoice', fields: ['invoiceNumber'], description: 'Invoice number' },
  { model: 'Payment', fields: ['paymentReference'], description: 'Payment reference' },
  { model: 'Expense', fields: ['expenseNumber'], description: 'Expense number' },
  { model: 'Supplier', fields: ['supplierCode'], description: 'Supplier code' },
  { model: 'SupplierPurchase', fields: ['purchaseNumber'], description: 'Supplier purchase number' },
  { model: 'SupplierPayment', fields: ['paymentReference'], description: 'Supplier payment reference' },
  { model: 'IdempotencyRecord', fields: ['key'], description: 'Idempotency record key' }
];

async function verifyAndSyncIndexes() {
  console.log('================================================================');
  console.log(' Mahadev Mechanical Car Garage - Production Index Verification');
  console.log('================================================================');

  try {
    await connectDB();
    console.log('[1/4] Connected to MongoDB database successfully.');

    // 1. Multi-document transaction check
    const txnSupport = await isTransactionSupported();
    console.log(`[2/4] Multi-Document ACID Transactions Support: ${txnSupport ? 'ENABLED (Replica Set / Atlas)' : 'DISABLED (Standalone)'}`);
    if (!txnSupport && process.env.NODE_ENV === 'production') {
      console.warn('  ⚠️ WARNING: Production MongoDB instance is not a Replica Set. Multi-document transactions will fail!');
    }

    // 2. Model Index Synchronization
    console.log('[3/4] Synchronizing defined schema indexes across all models...');
    const modelEntries = Object.entries(models).filter(([name, item]) => item && item.schema && item.collection);
    
    const results = [];
    let totalErrors = 0;

    for (const [modelName, Model] of modelEntries) {
      try {
        // Ensure collection exists
        await Model.init();

        // Safely synchronize indexes (builds missing indexes)
        await Model.syncIndexes();

        const collectionIndexes = await Model.collection.indexes();
        results.push({
          model: modelName,
          status: 'SYNCHRONIZED',
          indexCount: collectionIndexes.length,
          indexes: collectionIndexes.map(idx => idx.name)
        });
      } catch (syncErr) {
        totalErrors++;
        results.push({
          model: modelName,
          status: 'ERROR',
          error: syncErr.message
        });
        logger.error('INDEX_SYNC_ERROR', `Failed syncing indexes for ${modelName}`, { error: syncErr.message });
      }
    }

    // 3. Verify Mandatory Unique Constraints
    console.log('[4/4] Verifying critical unique constraint enforcement...');
    const constraintResults = [];

    for (const rule of MANDATORY_UNIQUE_CONSTRAINTS) {
      const Model = models[rule.model];
      if (!Model) {
        constraintResults.push({ ...rule, status: 'MODEL_NOT_FOUND' });
        totalErrors++;
        continue;
      }

      try {
        const indexes = await Model.collection.indexes();
        const shouldFixConflicts = process.argv.includes('--fix-conflicts');

        // Check if any index matches the required unique fields
        const match = indexes.find(idx => {
          const keyFields = Object.keys(idx.key);
          const fieldsMatch = rule.fields.length === keyFields.length && 
            rule.fields.every((f, i) => keyFields[i] === f);
          return fieldsMatch && idx.unique === true;
        });

        if (match) {
          constraintResults.push({
            rule: `${rule.model} -> [${rule.fields.join(', ')}]`,
            indexName: match.name,
            status: 'VERIFIED',
            unique: true
          });
        } else {
          // Check for non-unique conflicting index on exact fields
          const conflicting = indexes.find(idx => {
            const keyFields = Object.keys(idx.key);
            return rule.fields.length === keyFields.length && 
              rule.fields.every((f, i) => keyFields[i] === f) && !idx.unique;
          });

          if (conflicting && shouldFixConflicts) {
            console.log(`  [Resolve] Found conflicting non-unique index "${conflicting.name}" on ${rule.model}. Checking for duplicate values...`);
            
            // Check for duplicates before attempting any drop
            const field = rule.fields[0];
            const pipeline = [
              { $match: { [field]: { $ne: null } } },
              { $group: { _id: `$${field}`, count: { $sum: 1 } } },
              { $match: { count: { $gt: 1 } } }
            ];
            const duplicates = await Model.aggregate(pipeline);

            if (duplicates.length === 0) {
              console.log(`  [Resolve] No duplicate values found for ${rule.model}.${field}. Safely replacing non-unique index...`);
              await Model.collection.dropIndex(conflicting.name);
              await Model.syncIndexes();

              const recheckedIndexes = await Model.collection.indexes();
              const newMatch = recheckedIndexes.find(idx => {
                const keyFields = Object.keys(idx.key);
                return rule.fields.every(f => keyFields.includes(f)) && idx.unique === true;
              });

              if (newMatch) {
                constraintResults.push({
                  rule: `${rule.model} -> [${rule.fields.join(', ')}]`,
                  indexName: newMatch.name,
                  status: 'RESOLVED_AND_VERIFIED',
                  unique: true
                });
                continue;
              }
            } else {
              console.error(`  [Resolve Aborted] Found ${duplicates.length} duplicate entries in ${rule.model}.${field}. Cannot build unique index!`);
            }
          }

          // Check if partial unique index matches (e.g. appointmentId)
          const partialMatch = indexes.find(idx => {
            const keyFields = Object.keys(idx.key);
            return rule.fields.every(f => keyFields.includes(f)) && idx.unique === true;
          });

          if (partialMatch) {
            constraintResults.push({
              rule: `${rule.model} -> [${rule.fields.join(', ')}]`,
              indexName: partialMatch.name,
              status: 'VERIFIED_PARTIAL',
              unique: true
            });
          } else {
            totalErrors++;
            constraintResults.push({
              rule: `${rule.model} -> [${rule.fields.join(', ')}]`,
              status: conflicting ? 'CONFLICTING_NON_UNIQUE' : 'MISSING_UNIQUE_INDEX',
              unique: false
            });
          }
        }
      } catch (err) {
        totalErrors++;
        constraintResults.push({
          rule: `${rule.model} -> [${rule.fields.join(', ')}]`,
          status: 'QUERY_ERROR',
          error: err.message
        });
      }
    }

    // Print summary report
    console.log('\n--- Model Synchronization Summary ---');
    console.table(results.map(r => ({
      Model: r.model,
      Status: r.status,
      IndexCount: r.indexCount || 0,
      Error: r.error || 'None'
    })));

    console.log('\n--- Critical Unique Constraints Audit ---');
    console.table(constraintResults.map(c => ({
      Constraint: c.rule,
      Status: c.status,
      UniqueIndex: c.indexName || 'NONE'
    })));

    if (totalErrors > 0) {
      console.error(`\n❌ Index verification completed with ${totalErrors} issue(s). Check table above.`);
      process.exitCode = 1;
    } else {
      console.log('\n✅ All database indexes and unique constraints successfully verified and synchronized!');
    }
  } catch (fatalErr) {
    console.error('Fatal error during index verification:', fatalErr.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    console.log('================================================================\n');
  }
}

verifyAndSyncIndexes();
