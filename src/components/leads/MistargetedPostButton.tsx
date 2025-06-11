
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
    console.log('🎯 MistargetedPostButton clicked for lead:', lead.id);
    setShowFeedbackDialog(true);
    console.log('🎯 Dialog should now be open:', true);
  };

  const handleDialogClose = (open: boolean) => {
    console.log('🎯 Dialog close requested:', open);
    setShowFeedbackDialog(open);
  };

  const handleFeedbackSubmitted = () => {
    console.log('🎯 Feedback submitted for lead:', lead.id);
    setShowFeedbackDialog(false);
    onFeedbackSubmitted();
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleClick}
        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 h-auto text-left justify-start hover:bg-gray-100"
      >
        <TriangleAlert className="h-5 w-5 mr-3" />
        <span className="font-medium text-gray-700">Publication mal ciblée</span>
      </Button>

      <FeedbackDialog
        open={showFeedbackDialog}
        onOpenChange={handleDialogClose}
        lead={lead}
        onFeedbackSubmitted={handleFeedbackSubmitted}
      />

      {/* Debug info */}
      <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-100 rounded">
        🎯 MistargetedPostButton Debug: showFeedbackDialog = {showFeedbackDialog.toString()}
      </div>
    </>
  );
};

export default MistargetedPostButton;
