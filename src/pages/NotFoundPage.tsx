import { Link } from 'react-router-dom';
import { EmptyState, PageHeader } from '../components/PageHeader';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <div className="card">
        <EmptyState title="This page does not exist.">
          <Link to="/" className="btn">
            Back to dashboard
          </Link>
        </EmptyState>
      </div>
    </>
  );
}
