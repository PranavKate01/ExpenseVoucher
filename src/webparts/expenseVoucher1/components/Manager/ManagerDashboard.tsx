import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { spfi, SPFx } from '@pnp/sp';
import "@pnp/sp/items";
import "@pnp/sp/attachments";
import "@pnp/sp/lists";
import "@pnp/sp/webs";
import { WebPartContext } from "@microsoft/sp-webpart-base";

interface ManagerDashboardProps {
  onBack: () => void;
  context: WebPartContext;
}

interface RequestItem {
  Id: number;
  EmployeeName?: { Title: string };
  Department: string;
  Date: string;
  TotalAmount: number;
  Status: string;
  ManagerComment?: string;
  RmName?: { EMail: string };
  IsProjectRelated?: string;
  Project?: { Title: string };
  Currency?: string;
  EmployeeComment?: string;
  ExpenseItems?: string;
  Attachments?: { FileName: string; ServerRelativeUrl: string }[];
}

const STATUS_MAP = {
  Approve: "Pending with Account",
  Recycle: "Recycle",
  Reject: "Rejected"
};

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onBack, context }) => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [managerComment, setManagerComment] = useState("");

  const sp = spfi().using(SPFx(context));

  const fetchRequests = useCallback(async () => {
    try {
      const currentUserEmail = context.pageContext.user.email?.toLowerCase();
      const items: RequestItem[] = await sp.web.lists
        .getByTitle("ExpenseTransaction")
        .items
        .select(
          "Id",
          "EmployeeName/Title",
          "Department",
          "Date",
          "TotalAmount",
          "Status",
          "ManagerComment",
          "RmName/EMail",
          "IsProjectRelated",
          "Project/Title",
          "Currency",
          "EmployeeComment",
          "ExpenseItems"
        )
        .expand("EmployeeName", "RmName", "Project")
        .orderBy("Id", false)();

      const filtered = items.filter(item =>
        item?.RmName?.EMail?.toLowerCase() === currentUserEmail &&
        item.Status === "Pending with Manager"
      );

      setRequests(filtered);
    } catch (error) {
      console.error("Error loading manager data:", error);
    } finally {
      setLoading(false);
    }
  }, [context, sp]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const fetchAttachments = async (itemId: number) => {
    try {
      const files = await sp.web.lists.getByTitle("ExpenseTransaction").items.getById(itemId).attachmentFiles();
      return files.map(file => ({
        FileName: file.FileName,
        ServerRelativeUrl: file.ServerRelativeUrl
      }));
    } catch (error) {
      console.error(`Error fetching attachments for item ${itemId}:`, error);
      return [];
    }
  };

  const handleViewDetails = async (req: RequestItem) => {
    const attachments = await fetchAttachments(req.Id);
    setSelectedRequest({ ...req, Attachments: attachments });
  };

  const handleAction = async (action: keyof typeof STATUS_MAP) => {
    if (!selectedRequest) return;

    const newStatus = STATUS_MAP[action];

    try {
      await sp.web.lists.getByTitle("ExpenseTransaction").items.getById(selectedRequest.Id).update({
        Status: newStatus,
        ManagerComment: managerComment
      });

      setRequests(prev => prev.filter(req => req.Id !== selectedRequest.Id));
      setSelectedRequest(null);
      setManagerComment("");
    } catch (error) {
      console.error(`Error updating item ${selectedRequest.Id}:`, error);
    }
  };

  const parseExpenseItems = (itemsJson: string | undefined) => {
    try {
      const items = JSON.parse(itemsJson || '[]');
      return Array.isArray(items) ? items : [];
    } catch {
      return "error";
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4 text-primary fw-bold">
        <i className="bi bi-speedometer2 me-2"></i>Manager Dashboard
      </h2>

      {!selectedRequest && (
        loading ? (
          <div className="text-muted">Loading requests...</div>
        ) : requests.length > 0 ? (
          <div className="table-responsive shadow-sm rounded">
            <table className="table table-hover align-middle border">
              <thead className="table-primary">
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.Id}>
                    <td>{req.EmployeeName?.Title}</td>
                    <td><span className="badge bg-info text-dark">{req.Department}</span></td>
                    <td>{new Date(req.Date).toLocaleDateString()}</td>
                    <td>{req.Currency || "₹"} {req.TotalAmount.toFixed(2)}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => handleViewDetails(req)}>
                        <i className="bi bi-eye-fill"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info mt-3">🎉 No pending requests for your approval.</div>
        )
      )}

      {selectedRequest && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title">Request Details</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedRequest(null)}></button>
              </div>
              <div className="modal-body">
                <p><strong>Employee:</strong> {selectedRequest.EmployeeName?.Title}</p>
                <p><strong>Department:</strong> {selectedRequest.Department}</p>
                <p><strong>Date:</strong> {new Date(selectedRequest.Date).toLocaleDateString()}</p>
                <p><strong>Total Amount:</strong> {selectedRequest.Currency || "₹"} {selectedRequest.TotalAmount.toFixed(2)}</p>
                <p><strong>Status:</strong> {selectedRequest.Status}</p>
                <p><strong>Currency:</strong> {selectedRequest.Currency}</p>
                <p><strong>Is Project Related:</strong> {selectedRequest.IsProjectRelated}</p>
                <p><strong>Project:</strong> {selectedRequest.Project?.Title || 'N/A'}</p>
                <p><strong>Employee Comment:</strong><br /> {selectedRequest.EmployeeComment}</p>

                <div className="mt-3">
                  <strong>Expense Items:</strong>
                  <div className="table-responsive mt-2" style={{ maxHeight: "250px", overflowY: "auto" }}>
                    <table className="table table-bordered table-sm">
                      <thead className="table-light">
                        <tr>
                          <th>Head</th>
                          <th>Description</th>
                          <th>Date</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          (() => {
                            const parsed = parseExpenseItems(selectedRequest.ExpenseItems);
                            if (parsed === "error") {
                              return <tr><td colSpan={4}>❌ Error parsing JSON</td></tr>;
                            } else if (parsed.length === 0) {
                              return <tr><td colSpan={4}>No items found</td></tr>;
                            } else {
                              return parsed.map((item: any, index: number) => (
                                <tr key={index}>
                                  <td>{item.head}</td>
                                  <td>{item.description}</td>
                                  <td>{new Date(item.date).toLocaleDateString()}</td>
                                  <td>{selectedRequest.Currency || "₹"} {item.amount}</td>
                                </tr>
                              ));
                            }
                          })()
                        }
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4">
                  <strong>Attachments:</strong>
                  <ul className="list-group mt-2">
                    {selectedRequest.Attachments && selectedRequest.Attachments.length > 0 ? (
                      selectedRequest.Attachments.map((file, idx) => (
                        <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                          <a href={file.ServerRelativeUrl} target="_blank" rel="noopener noreferrer">
                            {file.FileName}
                          </a>
                          <i className="bi bi-box-arrow-up-right"></i>
                        </li>
                      ))
                    ) : (
                      <li className="list-group-item text-muted">No attachments found.</li>
                    )}
                  </ul>
                </div>

                <div className="mb-3 mt-4">
                  <label className="form-label fw-semibold">Manager Comment:</label>
                  <textarea
                    className="form-control"
                    value={managerComment}
                    onChange={(e) => setManagerComment(e.target.value)}
                    placeholder="Write your comment here..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer flex-wrap gap-2">
                <button className="btn btn-success flex-grow-1" onClick={() => handleAction("Approve")}>
                  <i className="bi bi-check-circle me-1"></i>Approve
                </button>
                <button className="btn btn-warning flex-grow-1" onClick={() => handleAction("Recycle")}>
                  <i className="bi bi-arrow-repeat me-1"></i>Recycle
                </button>
                <button className="btn btn-danger flex-grow-1" onClick={() => handleAction("Reject")}>
                  <i className="bi bi-x-circle me-1"></i>Reject
                </button>
                <button className="btn btn-outline-secondary flex-grow-1" onClick={() => setSelectedRequest(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-center text-sm-start">
        <button className="btn btn-outline-secondary" onClick={onBack}>
          <i className="bi bi-arrow-left-circle me-2"></i>Back to Home
        </button>
      </div>
    </div>
  );
};

export default ManagerDashboard;
