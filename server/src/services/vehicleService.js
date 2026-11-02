import { Vehicle } from '../models/Vehicle.js';
import { normalizeRegistrationNumber } from '../utils/normalizers.js';

/**
 * Resolves a vehicle for an appointment booking.
 * Enforces global plate uniqueness and prevents cross-customer reassignment.
 *
 * @param {Object} params
 * @param {import('mongoose').Types.ObjectId|string} params.customerId
 * @param {string} params.brand
 * @param {string} params.model
 * @param {string|null} [params.registrationNumber]
 * @returns {Promise<{
 *   vehicle: import('../models/Vehicle.js').Vehicle|null,
 *   conflict: boolean,
 *   conflictPlate?: string,
 *   displayPlate: string
 * }>}
 */
export async function resolveVehicle(
  {
    customerId,
    brand,
    model,
    registrationNumber = null
  },
  { session } = {}
) {
  const cleanBrand = brand ? brand.trim() : 'Unknown';
  const cleanModel = model ? model.trim() : 'Unknown';

  const { clean: plateClean, display: plateDisplay } = normalizeRegistrationNumber(registrationNumber);

  // Case 1: Valid registration number is provided
  if (plateClean) {
    const existingQuery = Vehicle.findOne({ registrationNumberClean: plateClean });
    if (session) existingQuery.session(session);
    const existingVehicle = await existingQuery;

    if (existingVehicle) {
      const isOwnerMatch = existingVehicle.customerId.toString() === customerId.toString();

      if (isOwnerMatch) {
        // Belongs to the same customer: update details if needed and link
        if (cleanBrand && cleanModel && (existingVehicle.brand !== cleanBrand || existingVehicle.model !== cleanModel)) {
          existingVehicle.brand = cleanBrand;
          existingVehicle.model = cleanModel;
          if (plateDisplay) existingVehicle.registrationNumberDisplay = plateDisplay;
          await existingVehicle.save({ session });
        }
        return {
          vehicle: existingVehicle,
          conflict: false,
          displayPlate: existingVehicle.registrationNumberDisplay || plateDisplay,
          isNewProvisional: false
        };
      }

      // Plate belongs to a DIFFERENT customer: flag conflict, do NOT reassign or link
      return {
        vehicle: null,
        conflict: true,
        conflictPlate: plateDisplay || plateClean,
        displayPlate: plateDisplay || plateClean,
        isNewProvisional: false
      };
    }

    // Plate does not exist in DB: create new vehicle under this customer
    try {
      const newVehicleDoc = new Vehicle({
        customerId,
        brand: cleanBrand,
        model: cleanModel,
        registrationNumberClean: plateClean,
        registrationNumberDisplay: plateDisplay,
        isProvisional: false
      });
      const newVehicle = await newVehicleDoc.save({ session });

      return {
        vehicle: newVehicle,
        conflict: false,
        displayPlate: plateDisplay,
        isNewProvisional: false
      };
    } catch (err) {
      if (err.code === 11000) {
        // Race condition: another request just created this plate
        const racedQuery = Vehicle.findOne({ registrationNumberClean: plateClean });
        if (session) racedQuery.session(session);
        const racedVehicle = await racedQuery;
        if (racedVehicle && racedVehicle.customerId.toString() === customerId.toString()) {
          return {
            vehicle: racedVehicle,
            conflict: false,
            displayPlate: racedVehicle.registrationNumberDisplay || plateDisplay,
            isNewProvisional: false
          };
        }
        return {
          vehicle: null,
          conflict: true,
          conflictPlate: plateDisplay || plateClean,
          displayPlate: plateDisplay || plateClean,
          isNewProvisional: false
        };
      }
      throw err;
    }
  }

  // Case 2: Registration number is absent
  // Check if customer already has a matching provisional vehicle for this brand & model
  const existingProvisionalQuery = Vehicle.findOne({
    customerId,
    brand: cleanBrand,
    model: cleanModel,
    isProvisional: true,
    registrationNumberClean: null
  });
  if (session) existingProvisionalQuery.session(session);
  const existingProvisional = await existingProvisionalQuery;

  if (existingProvisional) {
    return {
      vehicle: existingProvisional,
      conflict: false,
      displayPlate: '',
      isNewProvisional: false
    };
  }

  // Create a new provisional unplated vehicle so staff can verify and link later
  const provisionalDoc = new Vehicle({
    customerId,
    brand: cleanBrand,
    model: cleanModel,
    registrationNumberClean: null,
    registrationNumberDisplay: null,
    isProvisional: true,
    notes: 'Created via online booking without registration plate. Awaiting staff verification.'
  });
  const provisionalVehicle = await provisionalDoc.save({ session });

  return {
    vehicle: provisionalVehicle,
    conflict: false,
    displayPlate: '',
    isNewProvisional: true
  };
}
