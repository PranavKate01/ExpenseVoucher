import * as React from 'react';
import EmployeeForm from './Employee/EmployeeForm';
import MyRequests from './Employee/MyRequests';
import ManagerDashboard from './Manager/ManagerDashboard';
import AccountsDashboard from './Accounts/AccountsDashboard';
import HomeScreen from './HomeScreen';
import 'bootstrap/dist/css/bootstrap.min.css';

interface IExpenseVoucherProps {
  context: any; // Define context as a prop here
}

const ExpenseVoucher: React.FC<IExpenseVoucherProps> = ({ context }) => {
  const [screen, setScreen] = React.useState("home"); // Keeps track of the current screen

  // Function to navigate back to home
  const goBackToHome = () => setScreen("home");

  // Function to navigate to specific screens
  const handleNavigation = (screenName: string) => setScreen(screenName);

  return (
    <div>
      
      {screen === "home" && <HomeScreen onNavigate={handleNavigation} context={context} />}

      {screen === "employee" && (
      <EmployeeForm
    context={context}
    onBack={goBackToHome}
    goToMyRequests={() => handleNavigation("MyRequests")}
  />
)}
      
      {screen === "MyRequests" && <MyRequests context={context} onBack={goBackToHome} />}

      {screen === "manager" && <ManagerDashboard context={context} onBack={goBackToHome} />}

      {screen === "accounts" && <AccountsDashboard onBack={goBackToHome} />}
    </div>
  );
};

export default ExpenseVoucher;
