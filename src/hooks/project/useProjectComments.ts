import { useState } from "react";

import { api } from "@/hooks/api_client";
import { useDataCacheStore } from "@/store/useDataCacheStore";

type ProjectCommentAuthor = {
  id: string;
  email: string;
  full_name: string;
  profile_photo_url?: string | null;
  role?: {
    code?: string;
    display_name?: string;
  };
  company?: {
    code?: string;
    display_name?: string;
  };
};

export type ProjectComment = {
  id: string;
  project_id: string;
  author: ProjectCommentAuthor;
  body: string;
  created_at: string;
  updated_at: string;
};

export function useProjectComments() {
  const [loadingProjectComments, setLoadingProjectComments] = useState(false);
  const [sendingProjectComment, setSendingProjectComment] = useState(false);
  const [deletingProjectComment, setDeletingProjectComment] = useState(false);
  const [projectCommentsError, setProjectCommentsError] = useState<
    string | null
  >(null);

  const listProjectComments = async (projectId: string, force = false) => {
    try {
      setLoadingProjectComments(true);
      setProjectCommentsError(null);

      return await useDataCacheStore.getState().fetchResource<ProjectComment[]>(
        `projectComments:${projectId}`,
        async () => {
          const response = await api.get(`api/v1/projects/${projectId}/comments`);
          return response?.comments ?? [];
        },
        { force, initialData: [] },
      );
    } catch (error: any) {
      setProjectCommentsError(
        error?.message || "Не удалось загрузить обсуждение проекта",
      );
      return [];
    } finally {
      setLoadingProjectComments(false);
    }
  };

  const addProjectComment = async (projectId: string, body: string) => {
    try {
      setSendingProjectComment(true);
      setProjectCommentsError(null);

      const response = await api.post(`api/v1/projects/${projectId}/comments`, {
        body,
      });

      const comment = response?.comment ?? null;
      if (comment) {
        useDataCacheStore.getState().updateResource<ProjectComment[]>(
          `projectComments:${projectId}`,
          (comments) => [...comments, comment],
          [],
        );
      }
      return comment;
    } catch (error: any) {
      setProjectCommentsError(
        error?.message || "Не удалось отправить комментарий",
      );
      return null;
    } finally {
      setSendingProjectComment(false);
    }
  };

  const deleteProjectComment = async (projectId: string, commentId: string) => {
    try {
      setDeletingProjectComment(true);
      setProjectCommentsError(null);

      const response = await api.delete(
        `api/v1/projects/${projectId}/comments/${commentId}`,
      );

      const deletedComment = response?.deleted_comment ?? null;
      useDataCacheStore.getState().updateResource<ProjectComment[]>(
        `projectComments:${projectId}`,
        (comments) => comments.filter((comment) => comment.id !== commentId),
        [],
      );
      return deletedComment;
    } catch (error: any) {
      setProjectCommentsError(
        error?.message || "Не удалось удалить комментарий",
      );
      return null;
    } finally {
      setDeletingProjectComment(false);
    }
  };

  return {
    loadingProjectComments,
    sendingProjectComment,
    deletingProjectComment,
    projectCommentsError,
    listProjectComments,
    addProjectComment,
    deleteProjectComment,
  };
}
