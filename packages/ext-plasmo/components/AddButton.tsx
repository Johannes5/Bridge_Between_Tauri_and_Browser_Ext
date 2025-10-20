import PlasmicCircleButton from "./plasmic/short_stop/PlasmicCircleButton";

interface AddButtonProps {
    onClick: () => void;
}

export const AddButton = ({ onClick }: AddButtonProps) => {
    return (
        <PlasmicCircleButton
            onClick={onClick}
            root={{
                style: {
                    width: "26px",
                    alignSelf: "center",
                },
            }}
        />
    );
};
