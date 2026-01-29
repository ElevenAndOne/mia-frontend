import type { ReactNode } from 'react';

type LayoutProps = {
  children: ReactNode;
};

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
