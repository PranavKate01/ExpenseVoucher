
// import * as React from 'react';
// import ExpenseVoucherWebPart from '../../ExpenseVoucher1WebPart';

// const AccountsDashboard: React.FC = () => {
//   const [requests, setRequests] = React.useState<any[]>([]);

//   const load = async () => {
//     const sp = ExpenseVoucherWebPart.sp;
//     const items = await sp.web.lists.getByTitle("ExpenseTransaction").items.filter("Status eq 'Approved'")();
//     setRequests(items);
//   };

//   const handleFinalize = async (id: number, comment: string) => {
//     const sp = ExpenseVoucherWebPart.sp;
//     await sp.web.lists.getByTitle("ExpenseTransaction").items.getById(id).update({
//       Status: "Finalized",
//       AccountComment: comment
//     });
//     load();
//   };

//   React.useEffect(() => {
//     load();
//   }, []);

//   return (
//     <div>
//       <h3>Accounts Finalization</h3>
//       {requests.map(item => (
//         <div key={item.Id}>
//           {item.Title} - ₹{item.Amount}
//           <input
//             className="form-control mb-2"
//             placeholder="Account Comment"
//             onBlur={(e) => handleFinalize(item.Id, e.target.value)}
//           />
//         </div>
//       ))}
//     </div>
//   );
// };

// export default AccountsDashboard;


import * as React from 'react';

interface AccountsDashboardProps {
  onBack: () => void; // Back navigation function
}

const AccountsDashboard: React.FC<AccountsDashboardProps> = ({ onBack }) => {
  return (
    <div>
      <h3>Accounts Dashboard</h3>
      {/* Accounts-specific content */}
      <button className="btn btn-danger" onClick={onBack}>Back to Home</button>
    </div>
  );
};

export default AccountsDashboard;
