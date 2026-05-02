import { AccountSettingsCards,ChangePasswordCard,DeleteAccountCard  } from "@daveyplate/better-auth-ui";

export default function Settings() {
  return (
    <main className="min-h-[calc(100vh_-_70px)] bg-[#030305] flex flex-col items-center py-12 px-4 relative overflow-hidden font-sans">
      
      {/* Heavy Radial Glows to match your project's theme */}
      <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-[#701a75]/20 rounded-full blur-[160px] pointer-events-none fixed"></div>
      <div className="absolute bottom-0 -right-20 w-[600px] h-[600px] bg-[#1e3a8a]/20 rounded-full blur-[160px] pointer-events-none fixed"></div>

      {/* Main Content Wrapper */}
      <div className="z-10 w-full max-w-4xl space-y-6">
        
        {/* Page Header */}
        <div className="mb-8 pl-1">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Account Settings</h1>
          <p className="text-gray-400 text-sm">Manage your profile, security, and workspace preferences.</p>
        </div>

        {/* The Glassmorphism CSS Wrapper */}
        <div className="
          /* Target all cards inside the settings component */
          [&>div]:bg-white/[0.03] [&>div]:border [&>div]:border-white/10 [&>div]:backdrop-blur-3xl [&>div]:shadow-[0_0_30px_rgba(0,0,0,0.3)] [&>div]:text-white [&>div]:rounded-2xl
          
          /* Target card headers and footers to give them a subtle divider */
          [&_[data-slot=header]]:border-b [&_[data-slot=header]]:border-white/5 [&_[data-slot=header]]:pb-4
          [&_[data-slot=footer]]:border-t [&_[data-slot=footer]]:border-white/5 [&_[data-slot=footer]]:pt-4 [&_[data-slot=footer]]:bg-white/[0.01]
          
          /* Target the Inputs */
          [&_input]:bg-white/[0.05] [&_input]:border [&_input]:border-white/10 [&_input]:text-white [&_input]:placeholder-white/40 [&_input]:focus:ring-violet-500/50 [&_input]:focus:border-violet-500 [&_input]:rounded-lg [&_input]:h-10
          
          /* Target the Primary Submit Buttons (Save, Update) */
          [&_button[data-primary]]:bg-[#6d28d9] [&_button[data-primary]]:hover:bg-[#5b21b6] [&_button[data-primary]]:text-white [&_button[data-primary]]:border-none [&_button[data-primary]]:shadow-[0_0_20px_rgba(109,40,217,0.3)] [&_button[data-primary]]:transition-all [&_button[data-primary]]:h-10
          
          /* Target Secondary Buttons (Cancel, Sign Out) */
          [&_button:not([data-primary])]:bg-white/[0.05] [&_button:not([data-primary])]:border-white/10 [&_button:not([data-primary])]:text-white [&_button:not([data-primary])]:hover:bg-white/[0.1] [&_button:not([data-primary])]:h-10
          
          /* Target Typography */
          [&_label]:text-gray-300 [&_label]:font-medium [&_label]:text-xs [&_label]:uppercase [&_label]:tracking-wider
          [&_p]:text-gray-400 [&_p]:text-sm
          [&_h3]:text-white [&_h3]:font-semibold [&_h3]:text-lg
        ">
          <AccountSettingsCards />
        </div>
        <div className="flex flex-col gap-6">
            <ChangePasswordCard />
        </div>

          <div className="flex flex-col gap-6">
            <DeleteAccountCard />
        </div>
        

      </div>
    </main>
  );
}