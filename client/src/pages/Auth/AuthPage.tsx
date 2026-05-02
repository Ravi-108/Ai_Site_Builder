import { useLocation } from "react-router-dom";
import { AuthView } from "@daveyplate/better-auth-ui";

export default function AuthPage() {
  const location = useLocation();

  return (
    <main className="min-h-[calc(100vh-70px)] bg-[#0b0d14] flex grow flex-col items-center justify-center relative overflow-hidden p-4 md:p-6 font-sans">
      
      {/* Premium AI Glowing Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* The Magic Wrapper:
        We use Tailwind's [&_selector] to target the internal elements of the AuthView component 
        and force them to match our project's dark theme.
      */}
      <div className="z-10 w-full max-w-md 
        /* Target the main Card Container */
        [&>div]:bg-[#11131e]/90 [&>div]:border-gray-800 [&>div]:backdrop-blur-xl [&>div]:shadow-2xl [&>div]:text-white
        
        /* Target the Inputs */
        [&_input]:bg-[#1e2130] [&_input]:border-gray-700 [&_input]:text-white [&_input]:placeholder-gray-500 [&_input]:focus:ring-indigo-500 [&_input]:focus:border-indigo-500
        
        /* Target the Primary Submit Buttons */
        [&_button[data-primary]]:bg-indigo-600 [&_button[data-primary]]:hover:bg-indigo-700 [&_button[data-primary]]:text-white [&_button[data-primary]]:border-none
        
        /* Target Secondary/Ghost Buttons (like GitHub/Google login if enabled) */
        [&_button:not([data-primary])]:bg-[#1e2130] [&_button:not([data-primary])]:border-gray-700 [&_button:not([data-primary])]:text-white [&_button:not([data-primary])]:hover:bg-gray-800
        
        /* Target Labels, Paragraphs, and Links */
        [&_label]:text-gray-300 [&_p]:text-gray-400 [&_a]:text-indigo-400 [&_a:hover]:text-indigo-300
        
        /* Target the Title */
        [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white
      ">
        <AuthView pathname={location.pathname} />
      </div>

    </main>
  );
}