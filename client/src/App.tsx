import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner';
import Home from './pages/Home'
import Builder from './pages/Builder';
import Pricing from './pages/Pricing'
import Preview from './pages/Preview'
import Community from './pages/Community'
import Projects from './pages/Projects'
import MyProjects from './pages/MyProjects'
import View from './pages/View'
import Navbar from './components/Navbar'
import AuthPage from './pages/Auth/AuthPage';
import Settings from './pages/Settings';

const App = () => {
  return (
    <div>
      <Toaster />
      <Navbar />
     <Routes>
       <Route path ='/' element = {<Home />} />
     
       <Route path ='/pricing' element = {<Pricing /> } /> 
       <Route path="/community" element={<Community />} />
      <Route path="/view/:projectId" element={<View />} />
      
       <Route path ='/projects/:projectsId' element = {<Projects />} />
       <Route path ='/projects' element = {<MyProjects />} />
       <Route path ='/preview/:projectId' element = {<Preview />} />
       <Route path ='/preview/:projectId/:versionId' element = {<Preview />} />
       <Route path ='/community' element = {<Community />} />
       <Route path ='/view/:projectId' element = {<View />} />
       <Route path="/auth/:pathname" element={<AuthPage />} />
       <Route path='/account/settings' element={<Settings/>}/>
       <Route path="/builder/:projectId" element={<Builder />} />
       
     </Routes>

     <Toaster richColors position="bottom-right" theme="dark" />
    </div>
  )
}

export default App
