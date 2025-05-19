import * as React from 'react';
import EmployeeForm from './Employee/EmployeeForm';
import MyRequests from './Employee/MyRequests';
import ManagerDashboard from './Manager/ManagerDashboard';
import AccountsDashboard from './Accounts/AccountsDashboard';
import HomeScreen from './HomeScreen';
import { spfi } from '@pnp/sp';
import { SPFx } from '@pnp/sp/presets/all';
import 'bootstrap/dist/css/bootstrap.min.css';

interface IExpenseVoucherProps {
  context: any; // SPFx context
  
}

const ExpenseVoucher: React.FC<IExpenseVoucherProps> = ({ context   }) => {
  const [screen, setScreen] = React.useState("home");

  // ✅ NEW: Store edited item ID (null when not editing)
  const [editItemId, setEditItemId] = React.useState<number | null>(null);

  // Create PnP SPFI instance
  const [sp] = React.useState(() => spfi().using(SPFx(context)));

  const goBackToHome = () => {
    setScreen("home");
    setEditItemId(null); // Reset edit ID
  };

  const handleNavigation = (screenName: string) => {
    setScreen(screenName);
  };

  return (
    <div>
      {screen === "home" && (
        <HomeScreen onNavigate={handleNavigation} context={context} />
      )}

      {screen === "employee" && (
        <EmployeeForm
          context={context}
          onBack={goBackToHome}
          goToMyRequests={() => setScreen("MyRequests")}
          editItemId={editItemId} // ✅ Pass edit item ID
        />
      )}

      {screen === "MyRequests" && (
        <MyRequests
          sp={sp}
          onBack={goBackToHome}
          onEdit={(itemId: number) => {
            setEditItemId(itemId);      // ✅ Set item to edit
            setScreen("employee");      // ✅ Go to form to edit
          }}
        />
      )}

      {screen === "manager" && (
        <ManagerDashboard context={context} onBack={goBackToHome} />
      )}

      {screen === "accounts" && (
        <AccountsDashboard context={context}onBack={goBackToHome} />
      )}
    </div>
  );
};

export default ExpenseVoucher;