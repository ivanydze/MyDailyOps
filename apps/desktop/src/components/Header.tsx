import UserProfile from "./UserProfile";

export default function Header() {
  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Task Management
      </h2>
      <UserProfile size="md" showName={true} />
    </header>
  );
}

