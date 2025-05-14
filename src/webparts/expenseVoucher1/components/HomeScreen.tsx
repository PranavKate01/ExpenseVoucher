import * as React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { spfi, SPFI } from "@pnp/sp";
import { SPFx } from "@pnp/sp/presets/all";
import { WebPartContext } from "@microsoft/sp-webpart-base";

interface IHomeProps {
  onNavigate: (screen: string) => void;
  context: WebPartContext;
}

const HomeScreen: React.FC<IHomeProps> = ({ onNavigate, context }) => {
  const [isManager, setIsManager] = React.useState(false);
  const [isAccountUser, setIsAccountUser] = React.useState(false);
  const userEmail = context.pageContext.user.email;

  React.useEffect(() => {
    const sp: SPFI = spfi().using(SPFx(context));

    const fetchPermissions = async () => {
      try {
        // 1. Check if user is in RmName field
        const items: any[] = await sp.web.lists
          .getByTitle("ExpenseTransaction")
          .items
          .select("RmName/EMail")
          .expand("RmName")();

        const match = items.some(item => item.RmName?.EMail?.toLowerCase() === userEmail.toLowerCase());
        setIsManager(match);

        // 2. Check if user is in "Account Members" SharePoint group
        const groupUsers = await sp.web.siteGroups.getByName("Account Members").users();
        const isInAccountGroup = groupUsers.some(user => user.Email?.toLowerCase() === userEmail.toLowerCase());
        setIsAccountUser(isInAccountGroup);

      } catch (error) {
        console.error("Error checking roles:", error);
      }
    };

    fetchPermissions();
  }, [context, userEmail]);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light" style={{ background: 'linear-gradient(to right, #e0f7fa, #ffffff)' }}>
      <div className="container text-center">
        <h2 className="fw-bold mb-4">🚀 Welcome to the Expense Voucher Portal</h2>
        <p className="text-muted mb-5">Choose your role to get started</p>

        <div className="row justify-content-center g-4">

          {/* Employee Card - Always shown */}
          <div className="col-md-4">
            <div className="card border-0 shadow rounded-4 h-100 hover-card">
              <div className="card-body">
                <i className="bi bi-person-fill fs-1 text-primary mb-3"></i>
                <h5 className="card-title">Employee</h5>
                <p className="card-text text-muted">Submit your vouchers for approval</p>
                <button className="btn btn-primary w-100 mt-2" onClick={() => onNavigate("employee")}>
                  <i className="bi bi-box-arrow-in-right me-2"></i> Enter as Employee
                </button>
              </div>
            </div>
          </div>

          {/* Manager Card - Shown only if user is manager */}
          {isManager && (
            <div className="col-md-4">
              <div className="card border-0 shadow rounded-4 h-100 hover-card">
                <div className="card-body">
                  <i className="bi bi-clipboard-check fs-1 text-secondary mb-3"></i>
                  <h5 className="card-title">Manager</h5>
                  <p className="card-text text-muted">Approve or reject employee vouchers</p>
                  <button
                    className="btn btn-secondary w-100 mt-2"
                    onClick={() => onNavigate("manager")}
                  >
                    <i className="bi bi-box-arrow-in-right me-2"></i> Enter as Manager
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Accounts Card - Shown only if user is in Account Members group */}
          {isAccountUser && (
            <div className="col-md-4">
              <div className="card border-0 shadow rounded-4 h-100 hover-card">
                <div className="card-body">
                  <i className="bi bi-wallet2 fs-1 text-success mb-3"></i>
                  <h5 className="card-title">Accounts</h5>
                  <p className="card-text text-muted">Finalize payment and keep records</p>
                  <button className="btn btn-success w-100 mt-2" onClick={() => onNavigate("accounts")}>
                    <i className="bi bi-box-arrow-in-right me-2"></i> Enter as Accounts
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <style>
        {`
          .hover-card:hover {
            transform: translateY(-5px);
            transition: all 0.3s ease;
          }
        `}
      </style>
    </div>
  );
};

export default HomeScreen;
