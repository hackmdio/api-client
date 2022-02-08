import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import { User } from './type'

export class API {
  public axios: AxiosInstance
  constructor(accessToken: string) {
    this.axios = axios.create({
      baseURL: "http://localhost:3000/v1/api",
      headers:{
        "Content-Type": "application.json",
      }
    })
    this.axios.interceptors.request.use(
      (config: AxiosRequestConfig) =>{
        if (!config.headers) {
          config.headers = {};
        }

        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }

        return config
      },
      (err: AxiosError) => {
        return Promise.reject(err)
      }
    )
  }

  getMe = async () => {
    const { data } = await this.axios.get<User>("/me")
    return data
  }
}

const api = new API("60WUTLO5DIHIOHCIY9TO0QEDVATU55XBTE7JJJBX9UTG49M7Y1")
api.getMe()




