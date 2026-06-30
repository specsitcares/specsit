import React from 'react';
import SectionCardsEditor from './SectionCardsEditor';

const TABS = [
    { label: 'Top New Arrivals' },
    { label: 'Best Sellers' },
    { label: 'Explore Frame Styles', active: true, route: '/admin/settings/cms/explore-frame-styles' },
    { label: 'Explore Sunglasses' },
];

const ExploreFrameStylesEditor = () => (
    <SectionCardsEditor
        sectionKey="explore_frame_styles"
        pageTitle="Explore Frame Styles Section"
        defaultTitle="Explore Frame Styles"
        nameLabel="Frame Shape Name"
        addLabel="Add Frame Shape"
        tabs={TABS}
    />
);

export default ExploreFrameStylesEditor;
