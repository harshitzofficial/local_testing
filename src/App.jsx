import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { getDatabase, ref, set } from 'firebase/database'
import { app } from './services/firebase'
import './App.css'
import Results from './pages/room/results'
import LoginPage from './pages/login_page'
import { Route, Routes } from 'react-router-dom'
import backgroundImage from './assets/bg.jpg';
import Lobby from './pages/lobby'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './services/firebase'
import { useFirebase } from "./services/firebase";
import Room from './pages/room/room'
import HomePage from './pages/HomePage'






function App() {
  const [user_id, setUid] = useState(null);
  const f = useFirebase();

  useEffect(() => {
    const getGuestId = async () => {
      try {
        const user = await f.ensureAnonymousUser();
        setUid(user.uid); 
        localStorage.setItem('id', user.uid);
        
      } catch (error) {
        console.error("Error ensuring anonymous user:", error);
      }
    };

    if(!localStorage.getItem('id'))
      getGuestId();
  }, [f]);

  

  return (
    <>

      <Routes>



        <Route path='/' element={<HomePage user_id={user_id} />} />
        <Route path="/join" element={<div className="min-h-screen w-full flex items-center justify-center bg-cover bg-[#05071a] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] bg-center bg-no-repeat"><LoginPage user_id={user_id}></LoginPage></div>} />
        
        <Route path="/:roomId/lobby" element={<div className="min-h-screen w-full flex items-center justify-center bg-cover bg-[#05071a] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] bg-center bg-no-repeat"
        >
          <Lobby user_id={user_id} ></Lobby>
        </div>} />
        <Route path='/:roomId/room' element={<div className="min-h-screen bg-[#05071a] w-full flex items-center justify-center bg-cover bg-center bg-no-repeat">

          <Room user_id={user_id}></Room>
        </div>} />

        <Route path='/:roomId/results' element={<div className="min-h-screen bg-[#05071a] w-full flex items-center justify-center bg-cover bg-center bg-no-repeat text-white items-center">


          <Results></Results>

        </div>} />







      </Routes>


    </>
  )
}

export default App
