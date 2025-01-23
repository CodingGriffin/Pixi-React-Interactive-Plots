import { LeftPlot } from './components/LeftPlot';
// import { RightPlot } from './components/RightPlot';

export default function App() {
    
    return (
        <div className="flex flex-col min-h-screen bg-white p-8">
            <div className="flex gap-8 w-full">
                <div className="w-1/2">
                    <div className="text-center mb-2">Upload Points</div>
                    <LeftPlot 
                        width={500}
                        height={400}
                    />
                </div>
                <div className="w-1/2">
                    <div className="flex justify-between mb-2">
                        <div>Upload Model</div>
                        <div>Download Model</div>
                    </div>
                    {/* <RightPlot 
                        layers={layers}
                        width={500}
                        height={400}
                        onLayerUpdate={handleLayerUpdate}
                    /> */}
                </div>
            </div>
        </div>
    );
}
