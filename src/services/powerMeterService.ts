import api from "../lib/api";
import { PowerMeter } from "../types/powerMeter";

export const getPowerMeters = async () => {
    const response = await api.get('/power-meters');
    return response.data;
};

export const createPowerMeter = async (data: Partial<PowerMeter>) => {
    const response = await api.post('/power-meters', data);
    return response.data;
};

export const updatePowerMeter = async (id: number, data: Partial<PowerMeter>) => {
    const response = await api.put(`/power-meters/${id}`, data);
    return response.data;
};

export const deletePowerMeter = async (id: number) => {
    const response = await api.delete(`/power-meters/${id}`);
    return response.data;
};
