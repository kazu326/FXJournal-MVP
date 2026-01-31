export interface Course {
  id: string;
  title: string;
  description: string;
  sequence_number: number;
  is_required: boolean;
  icon: string;
  created_at: string;
}

export interface LectureNoteRecord {
  id?: string;
  user_id?: string;
  watch_progress?: number;
  completed_at?: string | null;
  last_watched_at?: string | null;
}

export interface Lecture {
  id: string;
  course_id: string;
  sequence_number: number;
  title: string;
  content_type: "video" | "pdf" | "article";
  video_url?: string | null;
  youtube_video_id?: string | null;
  slide_url?: string | null;
  external_url?: string | null;
  duration_minutes: number | null;
  is_required: boolean;
  description?: string | null;
  key_points?: string[] | null;
  lecture_notes?: LectureNoteRecord | null;
}

export type LectureStatus = "completed" | "in_progress" | "not_started";
