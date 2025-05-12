import * as React from 'react';
import { useEffect, useState } from 'react';
import ExpenseVoucherWebPart from '../../ExpenseVoucher1WebPart';

interface MyRequestsProps {
  context: any;
  onBack: () => void;
}

const MyRequests: React.FC<MyRequestsProps> = ({ context, onBack }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const sp = ExpenseVoucherWebPart.sp;
        const currentUser = await sp.web.currentUser();
        const userTitle = currentUser.Title;

        const items = await sp.web.lists
          .getByTitle("ExpenseTransaction")
          .items
          .select(
            "Id",
            "Department",
            "Date",
            "IsProjectRelated",
            "Currency",
            "TotalAmount",
            "Status",
            "EmployeeComment",
            "ManagerComment",
            "AccountComment",
            "EmployeeName/Title",
            "Project/Title",
            "RmName/Title"
          )
          .expand("EmployeeName", "Project", "RmName")
          .filter(`EmployeeName/Title eq '${userTitle}'`)
          ();

        setRequests(items);
        setFilteredRequests(items);
      } catch (error) {
        console.error("Error fetching requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  useEffect(() => {
    let filtered = [...requests];

    if (selectedStatus !== 'All') {
      filtered = filtered.filter((req) => req.Status === selectedStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter((req) =>
        (req.Department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         req.Project?.Title?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (startDate) {
      filtered = filtered.filter((req) => new Date(req.Date) >= new Date(startDate));
    }

    if (endDate) {
      filtered = filtered.filter((req) => new Date(req.Date) <= new Date(endDate));
    }

    setFilteredRequests(filtered);
  }, [selectedStatus, searchTerm, startDate, endDate, requests]);

  const getStatusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'Approved': return { color: 'green', fontWeight: 600 };
      case 'Pending with Manager': return { color: 'orange', fontWeight: 600 };
      case 'Pending with Account': return { color: 'blue', fontWeight: 600 };
      case 'Rejected': return { color: 'red', fontWeight: 600 };
      case 'Recycle': return { color: 'gray', fontWeight: 600 };
      default: return {};
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <i className="bi bi-arrow-left-circle" onClick={onBack} style={{ fontSize: 22, marginRight: 10, cursor: 'pointer', color: '#0078d4' }}></i>
        <i className="bi bi-folder2-open" style={{ fontSize: 22, marginRight: 10, color: '#0078d4' }}></i>
        <span style={titleStyle}>My Expense Requests</span>
      </div>

      <div style={filterBarStyle}>
        <label style={{ marginRight: 8, fontWeight: 500 }}>Filter by Status:</label>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} style={dropdownStyle}>
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
          placeholder="Search by project or department"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ marginLeft: 10, padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', flexGrow: 1 }}
        />

        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={dateInputStyle} />
        <span style={{ margin: '0 8px' }}>to</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={dateInputStyle} />
      </div>

      {loading ? (
        <p style={{ padding: 10 }}>Loading...</p>
      ) : filteredRequests.length === 0 ? (
        <p style={{ padding: 10 }}>No matching requests found.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr style={theadRowStyle}>
              <th style={thStyle}>Department</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Project</th>
              <th style={thStyle}>Currency</th>
              <th style={thStyle}>Total Amount</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Employee Comment</th>
              {/* Conditionally Render Manager and Account Comment Columns */}
              {['Pending with Account', 'Recycle', 'Rejected'].includes(selectedStatus) && <th style={thStyle}>Manager Comment</th>}
              {['Pending with Manager', 'Recycle', 'Rejected'].includes(selectedStatus) && <th style={thStyle}>Account Comment</th>}
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((item) => (
              <tr key={item.Id} style={tbodyRowStyle}>
                <td style={tdStyle}>{item.Department}</td>
                <td style={tdStyle}>{new Date(item.Date).toLocaleDateString()}</td>
                <td style={tdStyle}>{item.Project?.Title ?? 'N/A'}</td>
                <td style={tdStyle}>{item.Currency}</td>
                <td style={tdStyle}>{item.TotalAmount}</td>
                <td style={{ ...tdStyle, ...getStatusStyle(item.Status) }}>{item.Status}</td>
                <td style={tdStyle}>{item.EmployeeComment}</td>

                {/* Conditionally Render Comments Based on Status */}
                {['Pending with Account', 'Recycle', 'Rejected'].includes(item.Status) && <td style={tdStyle}>{item.ManagerComment}</td>}
                {['Pending with Manager', 'Recycle', 'Rejected'].includes(item.Status) && <td style={tdStyle}>{item.AccountComment}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ✅ Styling
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

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  border: '1px solid #e0e0e0',
  borderRadius: 4,
  overflow: 'hidden',
};

const theadRowStyle: React.CSSProperties = {
  backgroundColor: '#f1f9ff',
};

const tbodyRowStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
};

const thStyle: React.CSSProperties = {
  padding: '10px',
  borderBottom: '1px solid #d0d0d0',
  textAlign: 'left',
  color: '#005a9e',
};

const tdStyle: React.CSSProperties = {
  padding: '10px',
  borderBottom: '1px solid #f0f0f0',
};

export default MyRequests;
