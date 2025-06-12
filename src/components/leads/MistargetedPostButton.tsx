
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TriangleAlert } from 'lucide-react';
import FeedbackDialog from './FeedbackDialog';

interface MistargetedPostButtonProps {
  lead: {
    id: string;
    author_name: string;
    author_profile_url?: string;
    title?: string;
    text?: string;
    url?: string;
  };
  onFeedbackSubmitted: () => void;
}

const MistargetedPostButton = ({ lead, onFeedbackSubmitted }: MistargetedPostButtonProps) => {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

  const handleClick = () => {
    setShowFeedbackDialog(true);
  };

  const handleDialogClose = (open: boolean) => {
    setShowFeedbackDialog(open);
  };

  const handleFeedbackSubmitted = () => {
    setShowFeedbackDialog(false);
    onFeedbackSubmitted();
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleClick}
        className="w-full bg-white border border-gray-200 rounded-lg p-3 h-auto text-left justify-start hover:bg-gray-50 transition-colors"
      >
        <TriangleAlert className="h-4 w-4 mr-3 text-gray-600" />
        <span className="font-medium text-gray-700">Publication mal ciblée</span>
      </Button>

      <FeedbackDialog
        open={showFeedbackDialog}
        onOpenChange={handleDialogClose}
        lead={lead}
        onFeedbackSubmitted={handleFeedbackSubmitted}
      />
    </>
  );
};

export default MistargetedPostButton;
