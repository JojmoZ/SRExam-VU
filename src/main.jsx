import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { BrowserRouter, RouterProvider, createBrowserRouter } from "react-router-dom";
import Homepage from "./routes/Homepage.jsx";
import Loginpage from "./routes/Loginpage.jsx";
import Examscheduler from "./routes/Examscheduler.jsx";
import Profilepage from "./routes/Profilepage.jsx";
import Reportmanagement from "./routes/Reportmanagement.jsx";
import Reportmanagementdetails from "./routes/Reportmanagementdetails.jsx";
import Roommanagement from "./routes/Roommanagement.jsx";
import Subjectmanagement from "./routes/Subjectmanagement.jsx";
import TransactionDetail from "./routes/TransactionDetail.jsx";
import Usermanagement from "./routes/Usermanagement.jsx";
import Viewschedule from "./routes/Viewschedule.jsx";
import Viewtransaction from "./routes/Viewtransaction.jsx";
const router = createBrowserRouter([
  {
    path: "/",
    element:  <Loginpage></Loginpage>
  },
  {
    path: "/home",
    element: <Homepage></Homepage>
  },
  {
    path: "/Examscheduler",
    element: <Examscheduler></Examscheduler>
  },
  {
    path: "/Profilepage",
    element: <Profilepage></Profilepage>
  },
  {
    path: "/Reportmanag",
    element: <Reportmanagement></Reportmanagement>
  },
  {
    path: "/Reportmanagdetail/:transactionId",
    element: <Reportmanagementdetails></Reportmanagementdetails>
  },
  {
    path:"Roommanag",
    element: <Roommanagement></Roommanagement>
  },
  {
    path: "/Subjectmanag",
    element:<Subjectmanagement></Subjectmanagement>
  },
  {
    path: "/Transacdetail/:transactionId",
    element:<TransactionDetail></TransactionDetail>
  },
  {
    path:"/Usermanag",
    element:<Usermanagement></Usermanagement>
  },
  {
    path:"/Viewschedule",
    element:<Viewschedule></Viewschedule>
  },
  {
    path:"/Viewtransac",
    element:<Viewtransaction></Viewtransaction>
  }
]);
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
