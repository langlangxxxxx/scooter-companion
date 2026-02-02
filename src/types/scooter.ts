// Existing content of src/types/scooter.ts

interface ScooterDevice {
    id: string;
    name: string;
    type: string;
    // New fields added
    serial?: string;
    modelInfo?: ScooterModelInfo;
}

interface ScooterModelInfo {
    model: string;
    generation: number;
}

// Existing content of src/types/scooter.ts continues...