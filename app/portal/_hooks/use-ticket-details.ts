"use client";

import { useState } from "react";
import { createIssueComment, getIssueDetails } from "@/app/actions/portal";
import type { IssueDetailsDto } from "@/lib/contracts/portal";

export function useTicketDetails() {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState<IssueDetailsDto | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  async function openDetails(issueId: string) {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setCommentBody("");
    setCommentError(null);

    const res = await getIssueDetails(issueId);
    if (res.success) {
      setDetails(res.data);
    } else {
      setDetails(null);
    }

    setDetailsLoading(false);
  }

  async function submitComment() {
    if (!details?.id) return;
    const stateType = details.stateType?.toLowerCase();
    if (stateType === "canceled" || stateType === "completed" || stateType === "closed") {
      setCommentError("Comments are disabled for closed or canceled tickets.");
      return;
    }

    setCommentSubmitting(true);
    setCommentError(null);

    const res = await createIssueComment(details.id, commentBody);
    if (res.success) {
      const refreshed = await getIssueDetails(details.id);
      if (refreshed.success) {
        setDetails(refreshed.data);
      }
      setCommentBody("");
    } else {
      setCommentError(res.error || "Failed to post comment.");
    }

    setCommentSubmitting(false);
  }

  return {
    detailsOpen,
    setDetailsOpen,
    detailsLoading,
    details,
    commentBody,
    setCommentBody,
    commentSubmitting,
    commentError,
    openDetails,
    submitComment,
  };
}
