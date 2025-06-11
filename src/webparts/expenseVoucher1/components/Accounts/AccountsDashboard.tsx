import * as React from 'react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { spfi, SPFx } from '@pnp/sp';
import "@pnp/sp/webs";
import "@pnp/sp/site-groups";
import "@pnp/sp/site-users";
import "@pnp/sp/items";
import "@pnp/sp/lists";
import { WebPartContext } from "@microsoft/sp-webpart-base";


interface AccountsDashboardProps {
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
  Currency?: string;
  ManagerComment?: string;
  EmployeeComment?: string;
  ExpenseItems?: string;
  IsProjectRelated?: string;
  Project?: { Title: string };
  AttachmentFiles?: { FileName: string; ServerRelativeUrl: string }[];
}

const STATUS_MAP = {
  Approve: "Completed", // Note: Custom status for Approve
  Recycle: "Recycle",
  Reject: "Rejected"
};

const AccountsDashboard: React.FC<AccountsDashboardProps> = ({ onBack, context }) => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [comment, setComment] = useState("");

  // Initialize PnPjs with SPFx context only once per context change
  const sp = useMemo(() => spfi().using(SPFx(context)), [context]);

  // Check if current user is in the "Account Members" group
  const checkUserGroup = useCallback(async () => {
    try {
      const groupUsers = await sp.web.siteGroups.getByName("Account Members").users();
      const currentUserEmail = context.pageContext.user.email?.toLowerCase();
      const isUserInGroup = groupUsers.some(user => user.Email?.toLowerCase() === currentUserEmail);
      setIsMember(isUserInGroup);
    } catch (error) {
      console.error("Error checking group membership:", error);
      setIsMember(false);
    }
  }, [context.pageContext.user.email, sp]);

  // Fetch requests from SharePoint list filtering by Status
  const fetchRequests = useCallback(async () => {
    try {
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
          "Currency",
          "ManagerComment",
          "EmployeeComment",
          "ExpenseItems",
          "IsProjectRelated",
          "Project/Title",
          "AttachmentFiles"
        )
        .expand("EmployeeName", "Project",  "AttachmentFiles")
        .orderBy("Id", false)();

      const filtered = items.filter(item => item.Status === "Pending with Account");
      setRequests(filtered);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [sp]);

  // Run on component mount
  useEffect(() => {
    checkUserGroup();
    fetchRequests();
  }, [checkUserGroup, fetchRequests]);

  // Parse expense items JSON safely
  const parseExpenseItems = (itemsJson: string | undefined) => {
    try {
      const items = JSON.parse(itemsJson || '[]');
      return Array.isArray(items) ? items : [];
    } catch {
      return "error";
    }
  };

  // Handle Approve / Recycle / Reject actions with comments
  const handleAction = async (action: keyof typeof STATUS_MAP) => {
    if (!selectedRequest) return;

    const newStatus = STATUS_MAP[action];

    try {
      await sp.web.lists.getByTitle("ExpenseTransaction").items.getById(selectedRequest.Id).update({
        Status: newStatus,
        AccountComment: comment
      });

      // Remove updated request from list and reset state
      setRequests(prev => prev.filter(req => req.Id !== selectedRequest.Id));
      setSelectedRequest(null);
      setComment("");
    } catch (error) {
      console.error(`❌ Error updating item ${selectedRequest.Id}:`, error);
    }
  };

  // Format date string to local date format or show "-"
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "-";
    }
  };

  if (!isMember) {
    return (
      <div className="alert alert-danger mt-3">
        ⚠️ You are not authorized to view this dashboard.
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4 text-success fw-bold">
        <i className="bi bi-bank me-2"></i>Accounts Dashboard
      </h2>

      {!selectedRequest && (
        loading ? (
          <div className="text-center my-4">
            <div className="spinner-border text-success" role="status"></div>
            <p className="mt-2 text-muted">Loading requests...</p>
          </div>
        ) : requests.length > 0 ? (
          <div className="table-responsive shadow-sm rounded">
            <table className="table table-hover align-middle border">
              <thead className="table-success">
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.Id}>
                    <td>{req.EmployeeName?.Title || "N/A"}</td>
                    <td>{req.Department || "N/A"}</td>
                    <td>{formatDate(req.Date)}</td>
                    <td>{req.Currency || "₹"} {req.TotalAmount?.toFixed(2)}</td>
                    <td><span className="badge bg-warning text-dark">{req.Status}</span></td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => setSelectedRequest(req)}
                        aria-label={`View details of request ${req.Id}`}
                      >
                        <i className="bi bi-eye-fill"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info mt-3">✅ No requests pending for Accounts.</div>
        )
      )}

      {selectedRequest && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title">Request Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setSelectedRequest(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p><strong>Employee:</strong> {selectedRequest.EmployeeName?.Title}</p>
                <p><strong>Department:</strong> {selectedRequest.Department}</p>
                <p><strong>Date:</strong> {formatDate(selectedRequest.Date)}</p>
                <p><strong>Total:</strong> {selectedRequest.Currency || "₹"} {selectedRequest.TotalAmount.toFixed(2)}</p>
                <p><strong>Status:</strong> {selectedRequest.Status}</p>
                <p><strong>Project Related:</strong> {selectedRequest.IsProjectRelated || "N/A"}</p>
                <p><strong>Project:</strong> {selectedRequest.Project?.Title || "N/A"}</p>
                <p><strong>Employee Comment:</strong><br />{selectedRequest.EmployeeComment || "N/A"}</p>
                <p><strong>Manager Comment:</strong><br />{selectedRequest.ManagerComment || "N/A"}</p>

                <div className="mt-3">
                  <strong>Expense Items:</strong>
                  <table className="table table-bordered table-sm mt-2">
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
                                <td>{formatDate(item.date)}</td>
                                <td>{selectedRequest.Currency || "₹"} {item.amount}</td>
                              </tr>
                            ));
                          }
                        })()
                      }
                    </tbody>
                  </table>
                </div>
                <div className="mt-3">
               <strong>Attachments:</strong>
               {selectedRequest.AttachmentFiles && selectedRequest.AttachmentFiles.length > 0 ? (
              <ul className="list-unstyled mt-2">
               {selectedRequest.AttachmentFiles.map((file, index) => (
               <li key={index}>
               <a href={file.ServerRelativeUrl} target="_blank" rel="noopener noreferrer">
               📎 {file.FileName}
               </a>
              </li>
               ))}
              </ul>
              ) : (
             <p>No attachments found.</p>
               )}
              </div>
                <div className="mt-3">
                  <label className="form-label" htmlFor="commentTextarea">Comment:</label>
                  <textarea
                    id="commentTextarea"
                    className="form-control"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write your comment here..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-success" onClick={() => handleAction("Approve")}>Approve</button>
                <button className="btn btn-warning" onClick={() => handleAction("Recycle")}>Recycle</button>
                <button className="btn btn-danger" onClick={() => handleAction("Reject")}>Reject</button>
                <button className="btn btn-secondary" onClick={() => setSelectedRequest(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <button className="btn btn-outline-secondary" onClick={onBack}>
          <i className="bi bi-arrow-left-circle me-2"></i>Back to Home
        </button>
      </div>
    </div>
  );
};

export default AccountsDashboard;
