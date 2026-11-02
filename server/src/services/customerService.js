import { Customer } from '../models/Customer.js';
import { normalizeIndianPhone } from '../utils/normalizers.js';

/**
 * Finds an existing customer by normalized Indian mobile number or atomically creates one.
 * Never creates duplicate customer records for the same normalized mobile number.
 * Concurrency safe against simultaneous submissions.
 *
 * @param {Object} params
 * @param {string} params.fullName - Customer full name
 * @param {string} params.mobileNumber - Raw or pre-normalized mobile number
 * @param {string|null} [params.email] - Optional email address
 * @param {string} [params.city] - City (default: 'Gohana')
 * @param {string} [params.address] - Optional address
 * @param {boolean} [params.isBooking=true] - Whether this action is a booking (increments totalBookingsCount)
 * @returns {Promise<import('../models/Customer.js').Customer>}
 */
export async function findOrCreateCustomer(
  {
    fullName,
    mobileNumber,
    email = null,
    city = 'Gohana',
    address = '',
    isBooking = true
  },
  { session } = {}
) {
  const normalizedPhone = normalizeIndianPhone(mobileNumber);
  const cleanName = fullName ? fullName.trim() : 'Valued Customer';

  const updateOps = {
    $setOnInsert: {
      mobileNumber: normalizedPhone,
      city: city || 'Gohana',
      address: address || '',
      totalBookingsCount: isBooking ? 1 : 0
    },
    $set: {
      fullName: cleanName,
      lastVisitDate: new Date()
    }
  };

  if (email && typeof email === 'string' && email.trim()) {
    updateOps.$set.email = email.trim().toLowerCase();
  }

  if (isBooking) {
    updateOps.$inc = { totalBookingsCount: 1 };
    // Remove totalBookingsCount from $setOnInsert so $inc operates cleanly
    delete updateOps.$setOnInsert.totalBookingsCount;
  }

  const queryOptions = {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
    runValidators: true
  };
  if (session) queryOptions.session = session;

  try {
    const customer = await Customer.findOneAndUpdate(
      { mobileNumber: normalizedPhone },
      updateOps,
      queryOptions
    );
    return customer;
  } catch (err) {
    // If a concurrent duplicate key race occurs on mobileNumber
    if (err.code === 11000) {
      const existingQuery = Customer.findOne({ mobileNumber: normalizedPhone });
      if (session) existingQuery.session(session);
      const existing = await existingQuery;
      if (existing) {
        if (cleanName) existing.fullName = cleanName;
        existing.lastVisitDate = new Date();
        if (isBooking) {
          existing.totalBookingsCount = (existing.totalBookingsCount || 0) + 1;
        }
        await existing.save({ session });
        return existing;
      }
    }
    throw err;
  }
}
