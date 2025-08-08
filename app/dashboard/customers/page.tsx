import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customers',
};

export default function Page() {
  return <p className="bg-[green]">Customers Page</p>;
}