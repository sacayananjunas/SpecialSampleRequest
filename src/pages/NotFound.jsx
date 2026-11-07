import { Link } from 'react-router-dom';
import { Droplet } from 'lucide-react';
import { Page, EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <Page>
      <EmptyState
        icon={Droplet}
        title="This page leaked out of the pipeline"
        message="We couldn't find what you were looking for. It may have been moved, or the link is mistyped."
        action={<Link to="/" className="btn-primary">Back to PetroSync home</Link>}
      />
    </Page>
  );
}
