import React from "react";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";

const GTDeletion = () => {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2 mb-6">
        <div className="flex items-center gap-2">
          {/* Icon similar to EDC Device Updates, but you can replace with any GT icon if available */}
          <span className="inline-flex h-10 w-10 items-center justify-center rounded text-blue-700 bg-blue-100">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
              <rect x="3" y="6" width="18" height="12" rx="2" fill="#2563eb" fillOpacity="0.15" />
              <rect x="7" y="10" width="10" height="4" rx="1" fill="#2563eb" />
            </svg>
          </span>
          <h1 className="text-2xl font-bold text-gray-900">GT Deletion</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 font-mono">06 Feb 2026 [ 01:12:47 ]</span>
          <span className="text-xs font-semibold text-red-500">SSH <span className="align-middle">📈</span></span>
          <span className="ml-2 rounded bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">Admin</span>
        </div>
      </div>
      {/* Info Banner */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-lg">i</span>
          <span className="text-base text-gray-900">The platform supports up to 500 GT deletion requests per batch. Ensure your CSV follows the schema provided in the sample file.</span>
        </div>
        <button className="ml-4 rounded border border-blue-600 px-4 py-1 text-blue-600 font-semibold bg-white hover:bg-blue-50">OK! GOT IT</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Instructions */}
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Instructions</h3>
          <ul className="list-inside list-disc space-y-2 text-sm text-gray-700">
            <li>Keep the header in the file and each row of the CSV will represent a unique Retailer ID to be deleted.</li>
            <li>In case of bulk deletion, ensure the retailers exist in the selected database before initiating.</li>
            <li><b>Valid Retailer Format:</b> RET-XXXX-XXXX</li>
            <li><b>Databases:</b> Prod-A, Prod-B, Staging-1</li>
            <li><b>Required fields:</b> RetailerID, Reason, AdminID</li>
          </ul>
        </div>
        {/* Select Operation */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col items-center">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Select Operation</label>
          <select className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm">
            <option>GT Permanent Deletion</option>
          </select>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
          >
            <DownloadOutlinedIcon fontSize="small" />
            Download Sample File
          </button>
        </div>
        {/* Upload CSV */}
        <div className="rounded-xl border border-dashed border-blue-300 bg-white p-5 shadow-sm flex flex-col items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 16.5a1 1 0 0 1-1-1V7.83l-2.29 2.3a1 1 0 1 1-1.42-1.42l4-4a1 1 0 0 1 1.42 0l4 4a1 1 0 1 1-1.42 1.42L13 7.83V15.5a1 1 0 0 1-1 1Z"/><path fill="currentColor" d="M20 18.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 1 1 2 0v1h12v-1a1 1 0 1 1 2 0v2Z"/></svg>
            </div>
            <div className="text-sm font-semibold text-blue-600">Drag and Drop a CSV file here</div>
            <div className="text-xs text-blue-400">Max file size 10MB</div>
            <button className="mt-4 rounded border border-blue-400 bg-blue-50 px-4 py-2 text-blue-600 font-semibold hover:bg-blue-100">Upload</button>
          </div>
        </div>
      </div>
      {/* Get Retailer Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Get Retailer Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Select DBs to search for GT Data:</label>
            <select className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
              <option>Production-Cluster-A</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Enter store id here to verify :</label>
            <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="Comma separated store IDs or one per line..." />
          </div>
        </div>
        <button className="rounded bg-blue-600 px-6 py-2 text-white font-semibold hover:bg-blue-700">Search Data</button>
      </div>
      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="px-4 py-2 text-left">JOB ID</th>
              <th className="px-4 py-2 text-left">CREATED BY</th>
              <th className="px-4 py-2 text-left">CREATED AT</th>
              <th className="px-4 py-2 text-left">TYPE</th>
              <th className="px-4 py-2 text-left">STATUS</th>
              <th className="px-4 py-2 text-left">LOG</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-2">8a780ce2-0fcc-44a1-b2fa-a6293c4856cd</td>
              <td className="px-4 py-2">ravi.menon@company.com</td>
              <td className="px-4 py-2">2026-02-03T09:29:37.745Z</td>
              <td className="px-4 py-2">gt-permanent-delete</td>
              <td className="px-4 py-2 text-green-600 font-semibold">COMPLETED</td>
              <td className="px-4 py-2 text-blue-600 cursor-pointer"> <DownloadOutlinedIcon fontSize="small" /> </td>
            </tr>
            <tr>
              <td className="px-4 py-2">d341614a-d1f8-4729-9fb7-d7e984856b28</td>
              <td className="px-4 py-2">ravi.menon@company.com</td>
              <td className="px-4 py-2">2026-02-03T09:23:57.194Z</td>
              <td className="px-4 py-2">gt-soft-delete</td>
              <td className="px-4 py-2 text-green-600 font-semibold">COMPLETED</td>
              <td className="px-4 py-2 text-blue-600 cursor-pointer"> <DownloadOutlinedIcon fontSize="small" /> </td>
            </tr>
            <tr>
              <td className="px-4 py-2">c129485b-8d9e-4c22-a98f-23cf9821734a</td>
              <td className="px-4 py-2">alex.smith@company.com</td>
              <td className="px-4 py-2">2026-02-02T14:15:22.102Z</td>
              <td className="px-4 py-2">gt-archive-job</td>
              <td className="px-4 py-2 text-yellow-500 font-semibold">PROCESSING</td>
              <td className="px-4 py-2 text-blue-600 cursor-pointer"> <DownloadOutlinedIcon fontSize="small" /> </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GTDeletion;
