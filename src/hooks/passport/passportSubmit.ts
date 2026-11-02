import { api } from "@/hooks/api_client.ts";

const useHandlePassportSubmit = async (payload: any) => {
  try {
    const response = await api.put("api/v1/me/passport-details", payload);
    return response;
  } catch (error) {
    console.log(error);
  }
};

export default useHandlePassportSubmit;
