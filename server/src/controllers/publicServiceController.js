import { Service } from '../models/Service.js';

/**
 * GET /api/v1/public/services
 * Returns list of active public services without internal admin or cost fields.
 */
export async function getPublicServices(req, res, next) {
  try {
    const services = await Service.find({ isActive: true })
      .select('slug title shortDesc fullDesc priceDisplay basePrice category timeEstimate image tag icon highlights isPopular sortOrder')
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (err) {
    next(err);
  }
}
