// packages/ui/src/lib/mock.ts
export const MOCK_FEED = [
    { id: '1', videoUrl: '/videos/sample1.mp4', user: '@fashion_icon', likes: '1.2M', description: 'OOTD mùa hè rực rỡ #summer #vibe' },
    { id: '2', videoUrl: '/videos/sample2.mp4', user: '@streetwear_vn', likes: '850K', description: 'Phối đồ đi cafe cực chất' },
  ];
  
  export const MOCK_NAV_ITEMS = [
    { label: 'Feed', href: '/feed', icon: 'Home' },
    { label: 'Try-On', href: '/try-on', icon: 'Camera' },
    { label: '+', href: '/create', icon: 'Plus', isCenter: true },
    { label: 'Wardrobe', href: '/wardrobe', icon: 'Shirt' },
    { label: 'Profile', href: '/profile', icon: 'User' },
  ];