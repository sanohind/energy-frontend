export interface PowerMeter {
  id: number;
  slave_id: number;
  name: string;
  max_voltage: number;
  max_current: number;
  max_power: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}