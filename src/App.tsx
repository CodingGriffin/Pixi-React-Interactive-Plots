import { LeftPlot } from './components/LeftPlot';
import { RightPlot } from './components/RightPlot';

export default function App() {
    return (
        <div className="container mx-auto min-h-screen bg-gray-100 p-4">
            <div className="flex flex-col lg:flex-row justify-center gap-8">
                <div className="w-full lg:w-[600px]">
                    <div className="text-center mb-4 text-lg font-semibold">Left Plot</div>
                    <LeftPlot/>
                </div>
                <div className="w-full lg:w-[600px]">
                    <div className="text-center mb-4 text-lg font-semibold">Right Plot</div>
                    <RightPlot />
                </div>
            </div>
        </div>
    );
}
