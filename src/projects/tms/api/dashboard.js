import apiClient from "../../../api/client";

const DASHBOARD_ENDPOINT = "/__deku/api/v1/__tms/fetch/dashboard-data";

/**
 * Fetch TMS dashboard data for a given company and type.
 * @param {Object} params
 * @param {string} params.company - company identifier (e.g., "klydo")
 * @param {"info"|"data"} params.type - dataset type
 * @param {number} [params.limit=50] - page size
 * @param {number} [params.offset=0] - offset for pagination
 * @param {string} [params.startDate] - YYYY-MM-DD
 * @param {string} [params.endDate] - YYYY-MM-DD
 */
export const fetchTmsDashboardData = async ({
  company,
  type,
  limit = 100,
  offset = 0,
  startDate,
  endDate,
}) => {
  const payload = { company, type, limit, offset };
  if (startDate) payload.startDate = startDate;
  if (endDate) payload.endDate = endDate;
  const response = await apiClient.post(DASHBOARD_ENDPOINT, payload);
  return response?.data?.data ?? response?.data ?? [];
};

export default {
  fetchTmsDashboardData,
};
