import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react-native';
import {ReportView} from '../components/report';
import {criterionIds,type OutfitReport} from '@stylist/contracts';
const report:OutfitReport={schemaVersion:1,runId:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',status:'partial',summary:'The visible layers work together.',overallScore:null,verdict:null,criteria:criterionIds.map(id=>({id,applicable:id!=='intent',score:null,observation:'This detail is obscured.',explanation:'Use a wider frame.'})),strengths:['Visible colours relate well.'],suggestions:[],limitations:['Shoes are outside the frame.'],versions:{agent:'1',skill:'1',rubric:'1',model:'mock'}};
it('announces unavailable rating in text and expands criteria',()=>{render(<ReportView report={report}/>);expect(screen.getByLabelText('Rating unavailable')).toBeTruthy();expect(screen.getByText('Not enough visible detail to rate')).toBeTruthy();fireEvent.press(screen.getByRole('button',{name:'Explore the criteria'}));expect(screen.getByText('Intent · Not applicable')).toBeTruthy();});
