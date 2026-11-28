import { useEffect, useState } from "react";
import { Download, Loader2, Mail } from "lucide-react";
import Button from "./ui/Button";
import Modal from "./ui/Modal";
import { api } from "../utils/api";
import { exportCsv } from "../utils/csv";

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "-");

const STATUS_STYLE = {
  SENT: "bg-emerald-50 text-emerald-700 border-emerald-100",
  FAILED: "bg-rose-50 text-rose-700 border-rose-100",
  SENDING: "bg-blue-50 text-blue-700 border-blue-100",
  PENDING: "bg-slate-50 text-slate-600 border-slate-200",
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
      STATUS_STYLE[status] || STATUS_STYLE.PENDING
    }`}
  >
    {status}
  </span>
);

const CampaignEmailHistory = ({ refreshKey = 0 }) => {
  const [data, setData] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    api
      .get(`/api/campaigns/emails?page=${page}&limit=${limit}`)
      .then((result) => {
        if (cancelled) return;
        if (!result.success) throw new Error(result.message || "Could not load email history.");
        setData(result.data || []);
        setTotalRecords(result.pagination?.totalRecords || 0);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not load email history.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, refreshKey]);

  const openDetail = async (id) => {
    setDetail({});
    setDetailLoading(true);
    try {
      const result = await api.get(`/api/campaigns/emails/${id}`);
      if (!result.success) throw new Error(result.message || "Could not load this email.");
      setDetail(result.data);
    } catch (err) {
      setDetail(null);
      setError(err.message || "Could not load this email.");
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

  return (
    <div className="card flex-1 flex flex-col overflow-hidden">
      {error && (
        <div className="m-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-lg border border-rose-100">{error}</div>
      )}

      {data.length > 0 && (
        <div className="m-4 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              exportCsv("campaign-email-history.csv", data, [
                { label: "Subject", value: (row) => row.subject },
                { label: "Sender", value: (row) => row.sender?.user_name || row.sender_email },
                { label: "Template", value: (row) => row.template_name || "-" },
                { label: "Recipients", value: (row) => row.recipient_count },
                { label: "Sent", value: (row) => row.sent_count },
                { label: "Failed", value: (row) => row.failed_count },
                { label: "Status", value: (row) => row.status },
                { label: "Date", value: (row) => formatDate(row.created_at) },
              ])
            }
          >
            <Download size={14} className="mr-2" /> Export CSV
          </Button>
        </div>
      )}

      <div className="overflow-auto flex-1">
        <div className="table-container">
          <table className="table-modern" style={{ tableLayout: "fixed" }}>
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="w-80 min-w-[240px]">Subject</th>
                <th className="w-48 min-w-[144px]">Sender</th>
                <th className="w-40 min-w-[120px]">Template</th>
                <th className="w-28 min-w-[96px] text-right">Recipients</th>
                <th className="w-24 min-w-[88px] text-right">Sent</th>
                <th className="w-24 min-w-[88px] text-right">Failed</th>
                <th className="w-44 min-w-[160px]">Date</th>
                <th className="w-28 min-w-[100px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-24 text-center text-secondary">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="animate-spin text-vsph-core-blue" size={28} />
                      <p className="text-sm font-medium">Loading email history...</p>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-24 text-center text-secondary font-medium">
                    <Mail size={48} className="text-slate-200 mx-auto mb-2" />
                    <p>No emails sent yet.</p>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.campaign_email_id}
                    className="hover:bg-vsph-light-blue/20 cursor-pointer transition-colors"
                    onClick={() => openDetail(item.campaign_email_id)}
                  >
                    <td className="border-b border-border px-6 py-4 font-medium text-sidebar truncate">
                      {item.subject}
                    </td>
                    <td className="border-b border-border px-6 py-4 text-slate-600 truncate">
                      {item.sender?.user_name || item.sender_email}
                    </td>
                    <td className="border-b border-border px-6 py-4 text-slate-600 truncate">
                      {item.template_name || "-"}
                    </td>
                    <td className="border-b border-border px-6 py-4 text-slate-600 text-right">
                      {item.recipient_count}
                    </td>
                    <td className="border-b border-border px-6 py-4 text-slate-600 text-right">{item.sent_count}</td>
                    <td className="border-b border-border px-6 py-4 text-slate-600 text-right">
                      {item.failed_count}
                    </td>
                    <td className="border-b border-border px-6 py-4 text-slate-500 truncate">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="border-b border-border px-6 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-8 py-4 border-t border-border surface flex items-center justify-between shrink-0">
        <span className="text-xs text-secondary font-medium">
          Page {page} of {totalPages} · {totalRecords} email{totalRecords === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        isOpen={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Email details"
        widthClass="w-full max-w-3xl"
      >
        <div className="p-6 space-y-4">
          {detailLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Loading...
            </div>
          ) : detail ? (
            <>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-vsph-navy">{detail.subject}</div>
                <div className="text-xs text-slate-500">
                  From {detail.sender_email}
                  {detail.template_name ? ` · ${detail.template_name}` : ""} · {formatDate(detail.created_at)}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs">
                <span className="px-2 py-1 rounded bg-slate-100">Recipients: {detail.recipient_count}</span>
                <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">Sent: {detail.sent_count}</span>
                <span className="px-2 py-1 rounded bg-rose-50 text-rose-700">Failed: {detail.failed_count}</span>
              </div>

              {detail.error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-100">
                  {detail.error}
                </div>
              )}

              <div className="max-h-[50vh] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {(detail.recipients || []).map((recipient) => (
                  <div key={recipient.recipient_id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-vsph-navy truncate">
                        {recipient.name || recipient.email}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{recipient.email}</div>
                      {recipient.error && <div className="text-xs text-rose-600 mt-0.5">{recipient.error}</div>}
                    </div>
                    <StatusBadge status={recipient.status} />
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};

export default CampaignEmailHistory;
