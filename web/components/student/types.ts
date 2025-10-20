export type StudentProfile = {
  id: number;
  name: string | null;
  email: string | null;
  major: string | null;
  year: number | null;
};

export type TimetableSlot = {
  timeslot_id: number;
  day: string;
  day_display: string;
  period: number;
  start: string;
  end: string;
  label: string;
};

export type TimetableRow = {
  course: {
    id?: number;
    code?: string;
    name?: string;
    hours_per_week?: number;
    expected_enrollment?: number;
    needs_lab?: boolean;
  };
  room?: {
    id: number;
    name?: string;
    type?: string;
    capacity?: number;
    building?: string | null;
  } | null;
  slots: TimetableSlot[];
  review?: {
    average_overall?: number | null;
    review_count?: number;
  };
};

export type EnrollmentItem = {
  id: number;
  course_id: number;
  course_code: string | null;
  course_name: string | null;
  status: string;
  term: string | null;
  created_at: string;
};
