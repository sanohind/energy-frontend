import { useEffect, useState, type FormEvent } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb"; 
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Checkbox from "../../components/form/input/Checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../../components/ui/table";
import {
    getPowerMeters,
    createPowerMeter,
    updatePowerMeter,
    deletePowerMeter,
} from "../../services/powerMeterService";
import { PowerMeter } from "../../types/powerMeter";

interface PowerMeterFormState {
    name: string;
    slave_id: number;
    max_voltage: number;
    max_current: number;
    max_power: number;
    is_active: boolean;
}

const emptyForm: PowerMeterFormState = {
    name: "",
    slave_id: 1,
    max_voltage: 250,
    max_current: 100,
    max_power: 22,
    is_active: true,
};

export default function PowerMeterList() {
    const { isOpen, openModal, closeModal } = useModal();
    const [meters, setMeters] = useState<PowerMeter[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [listError, setListError] = useState("");
    const [editingMeter, setEditingMeter] = useState<PowerMeter | null>(null);
    const [form, setForm] = useState<PowerMeterFormState>(emptyForm);

    const fetchMeters = async () => {
        setIsLoading(true);
        setListError("");
        try {
            const res = await getPowerMeters();
            setMeters(res);
        } catch (error) {
            console.error("Failed to fetch data", error);
            setListError("Gagal memuat data Power Meter.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMeters();
    }, []);

    const handleAdd = () => {
        setEditingMeter(null);
        setForm(emptyForm);
        setFormError("");
        openModal();
    };

    const handleEdit = (meter: PowerMeter) => {
        setEditingMeter(meter);
        setForm({
            name: meter.name,
            slave_id: meter.slave_id,
            max_voltage: meter.max_voltage,
            max_current: meter.max_current,
            max_power: meter.max_power,
            is_active: meter.is_active,
        });
        setFormError("");
        openModal();
    };

    const handleDelete = async (meter: PowerMeter) => {
        if (!window.confirm(`Hapus ${meter.name}?`)) {
            return;
        }
        try {
            await deletePowerMeter(meter.id);
            await fetchMeters();
        } catch (error: any) {
            console.error("Failed to delete", error);
            setListError(error.response?.data?.message || "Gagal menghapus data.");
        }  
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError("");
        setIsSaving(true);

        try {
            if (editingMeter) {
                await updatePowerMeter(editingMeter.id, form);
            } else {
                await createPowerMeter(form);
            }

            closeModal();

            await fetchMeters();
        } catch (err: any) {
            console.error("Submit failed", err);
            setFormError(
                err.response?.data?.message || "Gagal menyimpan data power meter."
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <PageMeta
                title="Master Data Power Meter | Energy Monitoring"
                description="Kelola data perangkat PowerM Meter"
            />
            <PageBreadcrumb pageTitle="Master Data Power Meter" />

            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button size="sm" onClick={handleAdd}>
                        Add Power Meter
                    </Button>
                </div>

                {listError && (
                    <div className="p-3 text-sm rounded-lg bg-error-50 text-error-500 dark:bg-error-500/10">
                        {listError}
                    </div>
                )}

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <div className="max-w-full overflow-x-auto">
                        <Table>
                            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                <TableRow>
                                    <TableCell
                                        isHeader className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                                        Name
                                    </TableCell>
                                    <TableCell 
                                        isHeader className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                                        Slave ID
                                    </TableCell>
                                    <TableCell 
                                        isHeader className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                                        Max (V/A/kW)
                                    </TableCell>
                                    <TableCell 
                                        isHeader className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                                        Status
                                    </TableCell>
                                    <TableCell 
                                        isHeader className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400">
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell className="px-5 py-6 text-sm text-gray-500">
                                            Loading Data...
                                        </TableCell>
                                    </TableRow>
                                ) : meters.length === 0 ? (
                                    <TableRow>
                                        <TableCell className="px-5 py-6 text-sm text-gray-500">
                                            No power meter found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    meters.map((meter) =>(
                                        <TableRow key={meter.id}>
                                            <TableCell className="px-5 py-4 text-start sm:px-6">
                                                <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                                    {meter.name}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-start text-gray-500 dark:text-grey-400 text-theme-sm">
                                                {meter.slave_id}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-start text-gray-500 dark:text-grey-400 text-theme-sm">
                                                {meter.max_voltage}V / {meter.max_current}A / {meter.max_power}kW
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-start">
                                                <Badge size="sm" color={meter.is_active ? "success" : "error"}>
                                                    {meter.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => handleEdit(meter)}>
                                                        Edit
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => handleDelete(meter)}>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isOpen}
                onClose={closeModal}
                className="max-w-[584px] p-5 lg:p-10">

                <form onSubmit={handleSubmit}>
                    <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
                        {editingMeter ? "Edit Power Meter" : "Add Power Meter"}
                    </h4>

                    {formError && (
                        <div className="mb-5 rounded-lg bg-error-50 p-3 text-sm text-error-500 dark:bg-error-500/10">
                            {formError}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div>
                            <Label> Nama Power Meter</Label>
                            <Input
                                type="text"
                                placeholder="Misal: Panel Utama"
                                value={form.name}
                                onChange={(e) =>
                                    setForm((prev) => ({...prev, name: e.target.value}))
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Slave ID</Label>
                                <Input
                                    type="number"
                                    placeholder="1"
                                    value={form.slave_id}
                                    onChange={(e) =>
                                        setForm((prev) => ({...prev, slave_id: Number(e.target.value) }))
                                    }
                                />
                            </div>
                            <div>
                                <Label>Max Voltage (V)</Label>
                                <Input
                                    type="number"
                                    placeholder="250"
                                    value={form.max_voltage}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, max_voltage: Number(e.target.value) }))
                                }
                                />
                            </div>
                            <div>
                                <Label>Max Current (A)</Label>
                                <Input
                                    type="number"
                                    placeholder="100"
                                    value={form.max_current}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, max_current: Number(e.target.value) }))
                                }
                                />
                            </div>
                            <div>
                                <Label>Max Power (kW)</Label>
                                <Input
                                    type="number"
                                    placeholder="22"
                                    value={form.max_power}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, max_power: Number(e.target.value) }))
                                }
                                />
                            </div>
                        </div>

                        <Checkbox
                            checked={form.is_active}
                            onChange={(checked) =>
                                setForm((prev) => ({ ...prev, is_active:checked }))
                            }
                            label="Active"
                        />
                    </div>

                    <div className="mt-6 flex w-full items-center justify-end gap-3">
                        <Button size="sm" variant="outline" type="button" onClick={closeModal}>
                            Cancel
                        </Button>
                        <Button size="sm" type="submit" disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save"}
                        </Button> 
                    </div>
                </form>
            </Modal>
        </>
    )
}