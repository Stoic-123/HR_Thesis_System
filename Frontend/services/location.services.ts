import { api } from "@/lib/api";

export interface LocationData {
  id?: number;
  name: string;
  longitude?: string | null;
  latitude?: string | null;
  radius?: number | null;
}

export interface EmployeeLocationData {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  profile_path: string | null;
  department_name: string | null;
  position_name: string | null;
  location_id: number | null;
  primary_location: { id: number; name: string } | null;
  secondary_locations: { id: number; name: string }[];
}

export interface AssignEmployeeLocationPayload {
  employee_id: number;
  location_id: number | null;
  secondary_location_ids: number[];
}

export const getLocations = async () => {
  const res = await api.get("/api/location/get-location");
  return res.data;
};

export const addLocation = async (data: LocationData) => {
  const res = await api.post("/api/location/add-location", data);
  return res.data;
};

export const updateLocation = async (id: number, data: LocationData) => {
  const res = await api.put(`/api/location/update-location/${id}`, data);
  return res.data;
};

export const deleteLocation = async (id: number) => {
  const res = await api.delete(`/api/location/delete-location/${id}`);
  return res.data;
};

export const getEmployeeLocations = async () => {
  const res = await api.get("/api/location/employee-locations");
  return res.data;
};

export const assignEmployeeLocations = async (data: AssignEmployeeLocationPayload) => {
  const res = await api.post("/api/location/assign-employee-locations", data);
  return res.data;
};
