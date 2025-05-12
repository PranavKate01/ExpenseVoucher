import * as React from 'react';
import { useEffect, useState } from 'react';
import { spfi, SPFx } from '@pnp/sp';
import "@pnp/sp/items";
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
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onBack, context }) => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<{ [id: number]: string }>({});

  const sp = spfi().using(SPFx(context));

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const currentUserEmail = context.pageContext.user.email.toLowerCase();
        const items: RequestItem[] = await sp.web.lists
          .getByTitle("ExpenseTransaction")
          .items
          .select("Id", "EmployeeName/Title", "Department", "Date", "TotalAmount", "Status", "ManagerComment", "RmName/EMail")
          .expand("EmployeeName", "RmName")();

        const filtered = items.filter(item =>
          item.RmName?.EMail?.toLowerCase() === currentUserEmail &&
          item.Status === "Pending with Manager"
        );

        setRequests(filtered);
      } catch (error) {
        console.error("Error loading manager data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleAction = async (id: number, action: "Approve" | "Recycle" | "Reject") => {
    let newStatus = "";
    switch (action) {
      case "Approve":
        newStatus = "Pending with Account";
        break;
      case "Recycle":
        newStatus = "Recycle";
        break;
      case "Reject":
        newStatus = "Rejected";
        break;
    }

    const comment = comments[id] || "";

    try {
      await sp.web.lists.getByTitle("ExpenseTransaction").items.getById(id).update({
        Status: newStatus,
        ManagerComment: comment
      });

      setRequests(prev => prev.filter(req => req.Id !== id));
    } catch (error) {
      console.error(`Error updating item ${id}:`, error);
    }
  };

  const handleCommentChange = (id: number, value: string) => {
    setComments(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4 text-primary fw-bold">
        <i className="bi bi-speedometer2 me-2"></i>Manager Dashboard
      </h2>

      {loading ? (
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
                <th>Comment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.Id}>
                  <td>
                    <i className="bi bi-person-circle me-1 text-secondary"></i>
                    {req.EmployeeName?.Title}
                  </td>
                  <td><span className="badge bg-info text-dark">{req.Department}</span></td>
                  <td>{new Date(req.Date).toLocaleDateString()}</td>
                  <td>₹ {req.TotalAmount.toFixed(2)}</td>
                  <td style={{ maxWidth: 200 }}>
                    <textarea
                      className="form-control form-control-sm"
                      placeholder="Add a comment..."
                      value={comments[req.Id] || ""}
                      onChange={(e) => handleCommentChange(req.Id, e.target.value)}
                    />
                  </td>
                  <td>
                    <div className="d-flex flex-column gap-1">
                      <button className="btn btn-sm btn-success" onClick={() => handleAction(req.Id, "Approve")}>
                        <i className="bi bi-check-circle me-1"></i>Approve
                      </button>
                      <button className="btn btn-sm btn-warning" onClick={() => handleAction(req.Id, "Recycle")}>
                        <i className="bi bi-arrow-repeat me-1"></i>Recycle
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleAction(req.Id, "Reject")}>
                        <i className="bi bi-x-circle me-1"></i>Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="alert alert-info mt-3">🎉 No pending requests for your approval.</div>
      )}

      <div className="mt-4">
        <button className="btn btn-outline-secondary" onClick={onBack}>
          <i className="bi bi-arrow-left-circle me-2"></i>Back to Home
        </button>
      </div>
    </div>
  );
};

export default ManagerDashboard;

