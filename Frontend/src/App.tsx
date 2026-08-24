//import './App.css' //-> Global styles
//This is our main page. Since this is a single page application, all of the our 
//widgets will be rendered here. 
import Navbar from "./components/Navbar"
import Search from "./components/Search"
import Profile from "./components/Profile"
import { useAuth } from "./hooks/useAuth";
import { useState, useEffect } from "react";
import "./App.css"

function App() {
  const { isAuthenticated } = useAuth();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
 
  // Logging out closes the profile and resets the search layout.
  useEffect(() => {
    if (!isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCustomerId(null);
    }
  }, [isAuthenticated]);
 
  const hasSearched = selectedCustomerId !== null;
  

  return (
    <>
    <div className="app-root">
      <header className="app-header">
        <Navbar/>
      </header>
      <div className={`app-shell ${hasSearched ? "app-shell--split" : ""}`}>
        <div className="search-panel">
          <Search onCustomerSelected={setSelectedCustomerId} />
        </div>
 
        <div className="profile-panel">
          {hasSearched && <Profile customerId={selectedCustomerId} />}
        </div>
      </div>
    </div>

    </>
  )
}

export default App
