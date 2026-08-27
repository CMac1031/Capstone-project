import "../styles/Navbar.css";
import "../styles/Login.css";
import Login from "./Login";
import {useAuth} from "../hooks/useAuth"; //handled from provider.
import Account from "./Account";


function Logout(){
    const { logout } = useAuth();
    /**
     * This sub-component will render the Logout button
     * As well as the Account component
     */


    return (
    <>
        <div className="logout-container">
            <div
                className="login-button-box"
                onClick={logout}
                role="button"
                tabIndex={0}
                aria-haspopup="dialog"
            >
                <span className="login-button-label">Logout</span>
            </div>
            <Account/>
        </div>
        
    </>
    );
}

function Logo(){
    return (
        <>
            <h1 className="Logo">Pretty Nice Code CRM</h1>
        </>
    )
}

export default function Navbar(){

    const {user} = useAuth();

    return (
        <>
            <div id="navbar-container">
                <div>
                    <Logo/>
                </div>

                <div>
                    {user.permission === null ?  <Login/> : <Logout/>}
                </div>
                

            </div>
        
        </>
    );
}