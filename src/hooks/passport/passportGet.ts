import { api } from "@/hooks/api_client.ts";

const useHandlePassportGet = async (userid: any) => {
  try {
    const response = await api.get(`api/v1/users/${userid}/passport-details`);
    return response;
  } catch (error) {
    console.log(error);
  }
};

export default useHandlePassportGet;
