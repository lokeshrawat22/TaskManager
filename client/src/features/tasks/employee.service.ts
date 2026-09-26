import { API_BASE_URL } from "@/constants/api.constants";

// =====================================================
// EMPLOYEE SERVICE
// =====================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL;

// =====================================================
// EMPLOYEE TYPE
// =====================================================

export interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePhoto?: string;
}

// =====================================================
// GET ALL EMPLOYEES
// ADMIN ONLY
// =====================================================

export const getEmployees = async (): Promise<Employee[]> => {
  const response = await fetch(
    `${API_URL}/api/users/employees`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message || "Failed to fetch employees"
    );
  }

  return data.data.employees;
};