import {ReactNode, useState} from "react";
import {useJobContext} from "../Job/Context";
import LogImpactModal from "../Modal/LogImpactModal";
import {Button} from "../ui/button";

type Props = {
    children: ReactNode;
};

export default function TaskList({children}: Props) {
    const {updateJob, job} = useJobContext();
    const [logging, setLogging] = useState(false);

    const onDone = () => {
        if (!job) return;
        updateJob({
            ...job,
            status: "due",
        });
    };

    const onCreate = () => {
        onDone();
        setLogging(false);
    };

    const onLog = () => {
        setLogging(true);
    };

    return (
        <div className="mt-8">
            {children}
            <div className="flex flex-row w-full gap-2 mt-8">
                <Button 
                    onClick={onDone} 
                    type="button" 
                    variant="secondary" 
                    className="flex-grow"
                    disabled={!job}
                >
                    Done
                </Button>
                <Button
                    variant="outline"
                    className="flex-grow btn-secondary"
                    onClick={onLog}
                    type="button"
                    disabled={!job}
                >
                    Log
                </Button>
            </div>
            <LogImpactModal
                isOpen={logging}
                onCreate={onCreate}
                name={job?.name || job?.cron}
            />
        </div>
    );
}
