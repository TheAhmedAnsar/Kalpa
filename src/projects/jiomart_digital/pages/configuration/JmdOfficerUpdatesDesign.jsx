import React from "react";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

const activityRows = [
  {
    id: "#JMD-8821",
    createdBy: "admin_jane_doe",
    createdAt: "2023-10-24 14:15",
    type: "Bulk Insert",
    status: "Completed",
  },
  {
    id: "#JMD-8820",
    createdBy: "admin_jane_doe",
    createdAt: "2023-10-24 14:10",
    type: "Update",
    status: "Processing",
  },
  {
    id: "#JMD-8819",
    createdBy: "sys_ops_04",
    createdAt: "2023-10-24 13:45",
    type: "Bulk Insert",
    status: "Completed",
  },
];

const statusClass = {
  Completed: "bg-emerald-100 text-emerald-700",
  Processing: "bg-amber-100 text-amber-700",
};

const JmdOfficerUpdatesDesign = () => {
  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-[1280px] space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-600 text-white">
                <InfoOutlinedIcon sx={{ fontSize: 22 }} />
              </div>
              <h1 className="text-3xl font-bold">JMD Officer Updates</h1>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                SSH: Active
              </span>
              <span className="text-slate-500">14:22:05 UTC</span>
              <span className="font-semibold">Admin User</span>
            </div>
          </div>
        </header>

        <section className="flex items-start justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <div className="flex items-start gap-2">
            <InfoOutlinedIcon className="mt-0.5 text-sky-700" sx={{ fontSize: 20 }} />
            <div>
              <p className="font-semibold text-sky-900">Platform Notice</p>
              <p className="text-sm text-sky-700">
                The platform supports bulk updates for JMD officers. Ensure your CSV matches the required schema.
              </p>
            </div>
          </div>
          <button type="button" className="text-sm font-semibold text-sky-700 hover:text-sky-900">
            View Schema
          </button>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <DescriptionOutlinedIcon sx={{ fontSize: 20 }} />
              </div>
              <h2 className="text-2xl font-bold">Insert JMD Officer</h2>
            </div>
            <p className="text-sm leading-7 text-slate-600">
              Keep the header in the file and each row of the CSV will represent a unique Employee ID. For bulk
              updates, ensure the employee exists in the system before initiating.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold">Select Action</h2>
            <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none">
              <option>Insert Officer</option>
            </select>
            <button
              type="button"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-600 bg-white px-4 py-3 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50"
            >
              <DownloadOutlinedIcon fontSize="small" />
              Download Sample File
            </button>
          </article>

          <article className="rounded-2xl border-2 border-dashed border-sky-400 bg-white p-6 shadow-sm">
            <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <UploadOutlinedIcon sx={{ fontSize: 30 }} />
              </div>
              <p className="text-2xl font-semibold">Drag and Drop a CSV file here</p>
              <p className="mb-5 text-sm text-slate-500">or click to browse from computer</p>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-700"
              >
                <UploadOutlinedIcon fontSize="small" />
                Upload File
              </button>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-3xl font-bold">Get JMD Officer Info</h2>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Enter Employee IDs:</label>
          <textarea
            rows={4}
            placeholder="Comma separated employee ids here..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none"
          />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-600 bg-cyan-600 px-7 py-3 text-sm font-bold text-white transition hover:bg-cyan-700"
            >
              <SearchOutlinedIcon fontSize="small" />
              Fetch Data
            </button>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-3xl font-bold">Recent Activity</h2>
            <button type="button" className="text-sm font-semibold text-cyan-700 hover:text-cyan-900">
              View All History
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">JOB ID</th>
                  <th className="px-5 py-3 font-semibold">CREATED BY</th>
                  <th className="px-5 py-3 font-semibold">CREATED AT</th>
                  <th className="px-5 py-3 font-semibold">TYPE</th>
                  <th className="px-5 py-3 font-semibold">STATUS</th>
                  <th className="px-5 py-3 text-right font-semibold">LOG</th>
                </tr>
              </thead>
              <tbody>
                {activityRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-5 py-4 font-medium text-cyan-700">{row.id}</td>
                    <td className="px-5 py-4">{row.createdBy}</td>
                    <td className="px-5 py-4 text-slate-600">{row.createdAt}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">{row.type}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[row.status]}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <DownloadOutlinedIcon fontSize="small" className="text-slate-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="rounded-2xl border border-slate-200 bg-gradient-to-r from-cyan-50 via-sky-50 to-emerald-50 px-6 py-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-cyan-700">1,284</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Total Officers</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-cyan-700">42</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Pending Updates</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-cyan-700">99.9%</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">System Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-cyan-700">15s</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Avg Process Time</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default JmdOfficerUpdatesDesign;
