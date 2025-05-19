import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { SPFI } from '@pnp/sp';
import "@pnp/sp/webs";
import "@pnp/sp/items";
import "@pnp/sp/site-users";
import 'bootstrap-icons/font/bootstrap-icons.css';

interface IRequestItem {
  Id: number;
  Date: string;
  Currency: string;
  TotalAmount: number;
  Status: string;
  EmployeeComment?: string;
  ManagerComment?: string;
  AccountComment?: string;
  Project?: { Title: string };
}

interface MyRequestsProps {
  sp: SPFI;
  onBack: () => void;
  onEdit: (itemId: number, source: string) => void;
}

const MyRequests: React.FC<MyRequestsProps> = ({ sp, onBack, onEdit }) => {
  const [requests, setRequests] = useState<IRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const currentUser = await sp.web.currentUser();
      const userTitle = currentUser.Title;

      const items = await sp.web.lists.getByTitle("ExpenseTransaction").items
        .select(
          "Id",
          "Date",
          "Currency",
          "TotalAmount",
          "Status",
          "EmployeeComment",
          "ManagerComment",
          "AccountComment",
          "EmployeeName/Title",
          "Project/Title"
        )
        .expand("EmployeeName", "Project")
        .filter(`EmployeeName/Title eq '${userTitle}'`)();

      setRequests(items);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (selectedStatus !== 'All' && req.Status !== selectedStatus) return false;
      if (searchTerm.trim() && !req.Project?.Title?.toLowerCase().includes(searchTerm.trim().toLowerCase())) return false;

      const itemDate = req.Date ? new Date(req.Date) : null;
      const from = startDate ? new Date(startDate) : null;
      const to = endDate ? new Date(endDate) : null;

      if (itemDate) {
        if (from && itemDate < from) return false;
        if (to && itemDate > to) return false;
      }

      return true;
    });
  }, [requests, selectedStatus, searchTerm, startDate, endDate]);

  const getStatusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'Approved': return { color: 'green', fontWeight: 600 };
      case 'Pending with Manager': return { color: 'orange', fontWeight: 600 };
      case 'Pending with Account': return { color: 'blue', fontWeight: 600 };
      case 'Rejected': return { color: 'red', fontWeight: 600 };
      case 'Recycle': return { color: 'gray', fontWeight: 600 };
      case 'Draft': return { color: '#888', fontWeight: 600 };
      case 'Completed': return { color: 'green', fontWeight: 600 };
      default: return {};
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <i
          className="bi bi-arrow-left-circle"
          onClick={onBack}
          style={{ fontSize: 22, marginRight: 10, cursor: 'pointer', color: '#0078d4' }}
          title="Back"
        ></i>
        <i className="bi bi-folder2-open" style={{ fontSize: 22, marginRight: 10, color: '#0078d4' }}></i>
        <span style={titleStyle}>My Expense Requests</span>
      </div>

      <div style={filterBarStyle}>
        <label style={{ marginRight: 8, fontWeight: 500 }}>Filter by Status:</label>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={dropdownStyle}
          aria-label="Filter by status"
        >
          <option value="All">All</option>
          <option value="Draft">Draft</option>
          <option value="Pending with Manager">Pending with Manager</option>
          <option value="Pending with Account">Pending with Account</option>
          <option value="Completed">Completed</option>
          <option value="Recycle">Recycle</option>
          <option value="Rejected">Rejected</option>
        </select>

        <input
          type="text"
          placeholder="Search by project"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ marginLeft: 10, padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', flexGrow: 1, minWidth: 150 }}
          aria-label="Search by project"
        />

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={dateInputStyle}
          aria-label="Start date filter"
        />
        <span style={{ margin: '0 8px' }}>to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={dateInputStyle}
          aria-label="End date filter"
        />
      </div>

      {loading ? (
        <p style={{ padding: 10 }}>Loading requests...</p>
      ) : filteredRequests.length === 0 ? (
        <p style={{ padding: 10 }}>No matching requests found.</p>
      ) : (
        <div style={tableWrapperStyle} tabIndex={0} aria-label="Expense requests table wrapper">
          <table style={tableStyle} aria-label="Expense requests table">
            <thead>
              <tr style={theadRowStyle}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Project</th>
                <th style={thStyle}>Currency</th>
                <th style={thStyle}>Total Amount</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Employee Comment</th>
                <th style={thStyle}>Manager Comment</th>
                <th style={thStyle}>Account Comment</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((item) => (
                <tr key={item.Id} style={tbodyRowStyle}>
                  <td style={tdStyle}>{item.Date ? new Date(item.Date).toLocaleDateString() : '-'}</td>
                  <td style={tdStyle}>{item.Project?.Title ?? 'N/A'}</td>
                  <td style={tdStyle}>{item.Currency}</td>
                  <td style={tdStyle}>{item.TotalAmount?.toFixed(2)}</td>
                  <td style={{ ...tdStyle, ...getStatusStyle(item.Status) }}>{item.Status}</td>
                  <td style={tdStyle}>{item.EmployeeComment ?? '-'}</td>
                  <td style={tdStyle}>{item.ManagerComment ?? '-'}</td>
                  <td style={tdStyle}>{item.AccountComment ?? '-'}</td>
                  <td style={tdStyle}>
                    {(item.Status === 'Draft' || item.Status === 'Recycle') && (
                      <button
                        style={editButtonStyle}
                        onClick={() => onEdit(item.Id, "MyRequests")}
                        title={item.Status === 'Recycle' ? "Recycle Request" : "Edit Request"}
                        aria-label={item.Status === 'Recycle' ? "Recycle Request" : "Edit Request"}
                      >
                        <i className={item.Status === 'Recycle' ? "bi bi-recycle" : "bi bi-pencil"}></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  padding: 20,
  fontFamily: 'Segoe UI, sans-serif',
};

const headerStyle: React.CSSProperties = {
  backgroundColor: '#e0f3ff',
  padding: '10px 15px',
  display: 'flex',
  alignItems: 'center',
  borderRadius: 6,
  marginBottom: 20,
  border: '1px solid #c0e2ff',
};

const titleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#0078d4',
};

const filterBarStyle: React.CSSProperties = {
  marginBottom: 15,
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 10,
};

const dropdownStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 4,
  border: '1px solid #ccc',
  fontSize: 14,
};

const dateInputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 4,
  border: '1px solid #ccc',
  fontSize: 14,
};

const tableWrapperStyle: React.CSSProperties = {
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch', // smooth scrolling on iOS
  border: '1px solid #e0e0e0',
  borderRadius: 4,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: 900, // ensures table doesn’t squish too much on small screens
};

const theadRowStyle: React.CSSProperties = {
  backgroundColor: '#f1f9ff',
};

const tbodyRowStyle: React.CSSProperties = {
  backgroundColor: '#fff',
};

const thStyle: React.CSSProperties = {
  padding: '10px',
  borderBottom: '1px solid #ccc',
  textAlign: 'left',
  fontWeight: 600,
  background: '#f1f1f1',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px',
  borderBottom: '1px solid #eaeaea',
  whiteSpace: 'nowrap',
};

const editButtonStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: '#0078d4',
  fontSize: 18,
};

export default MyRequests;
