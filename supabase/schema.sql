-- TravelOS Database Schema for Supabase
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABLES
-- ==========================================

-- Trips Table
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,

    -- Hotel anchor (for clustering)
    hotel_name TEXT,
    hotel_location GEOGRAPHY(POINT, 4326), -- PostGIS geography type
    hotel_address TEXT,

    -- Trip metadata
    city TEXT NOT NULL,
    cities TEXT[] DEFAULT '{}', -- Array of cities
    total_budget DECIMAL(10, 2),
    currency TEXT DEFAULT 'USD',

    -- Sharing
    is_public BOOLEAN DEFAULT FALSE,
    share_token TEXT UNIQUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Days Table
CREATE TABLE days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    date DATE,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(trip_id, day_number)
);

-- Source Type Enum
CREATE TYPE source_type AS ENUM (
    'TEXT',
    'SCREENSHOT',
    'XHS_LINK',
    'XHS_SCREENSHOT',
    'AR_SCAN',
    'REMIX',
    'MANUAL'
);

-- Activities Table
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_id UUID NOT NULL REFERENCES days(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,

    -- Place information
    place_name TEXT NOT NULL,
    category TEXT NOT NULL,
    city TEXT NOT NULL,

    -- Geolocation (PostGIS)
    location GEOGRAPHY(POINT, 4326), -- lat/lng stored as geography
    address TEXT,

    -- Metadata
    description TEXT,
    rating DECIMAL(2, 1), -- e.g., 4.5
    website_url TEXT,
    image_url TEXT,
    cost DECIMAL(10, 2),
    currency TEXT,

    -- Travel metadata
    travel_time_next TEXT, -- e.g., "15 min walk"
    distance_from_hotel DECIMAL(10, 2), -- in meters

    -- Source tracking
    source source_type NOT NULL,
    source_url TEXT,
    original_context TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_data JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(day_id, order_index)
);

-- Remix Links Table
CREATE TABLE remix_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    child_trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    attribution_reason TEXT,
    modification_type TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(parent_trip_id, child_trip_id)
);

-- ==========================================
-- INDEXES for Performance
-- ==========================================

-- Trips indexes
CREATE INDEX idx_trips_share_token ON trips(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_trips_is_public ON trips(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_trips_created_at ON trips(created_at DESC);

-- Days indexes
CREATE INDEX idx_days_trip_id ON days(trip_id);
CREATE INDEX idx_days_trip_day ON days(trip_id, day_number);

-- Activities indexes
CREATE INDEX idx_activities_day_id ON activities(day_id);
CREATE INDEX idx_activities_day_order ON activities(day_id, order_index);
CREATE INDEX idx_activities_location ON activities USING GIST(location); -- Spatial index
CREATE INDEX idx_activities_source ON activities(source);

-- Remix links indexes
CREATE INDEX idx_remix_parent ON remix_links(parent_trip_id);
CREATE INDEX idx_remix_child ON remix_links(child_trip_id);

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Function to calculate distance from hotel
CREATE OR REPLACE FUNCTION calculate_distance_from_hotel(activity_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    activity_location GEOGRAPHY;
    hotel_location GEOGRAPHY;
    distance DECIMAL;
BEGIN
    -- Get activity location
    SELECT location INTO activity_location
    FROM activities
    WHERE id = activity_id;

    -- Get hotel location from trip
    SELECT t.hotel_location INTO hotel_location
    FROM activities a
    JOIN days d ON a.day_id = d.id
    JOIN trips t ON d.trip_id = t.id
    WHERE a.id = activity_id;

    -- Calculate distance in meters
    IF activity_location IS NOT NULL AND hotel_location IS NOT NULL THEN
        distance := ST_Distance(activity_location, hotel_location);
    END IF;

    RETURN distance;
END;
$$ LANGUAGE plpgsql;

-- Function to get activities within radius of hotel
CREATE OR REPLACE FUNCTION get_activities_near_hotel(
    p_trip_id UUID,
    radius_meters INTEGER DEFAULT 2000
)
RETURNS TABLE (
    activity_id UUID,
    place_name TEXT,
    distance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.place_name,
        ST_Distance(a.location, t.hotel_location) as distance
    FROM activities a
    JOIN days d ON a.day_id = d.id
    JOIN trips t ON d.trip_id = t.id
    WHERE t.id = p_trip_id
      AND t.hotel_location IS NOT NULL
      AND a.location IS NOT NULL
      AND ST_DWithin(a.location, t.hotel_location, radius_meters)
    ORDER BY distance;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Auto-update updated_at on trips
CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on days
CREATE TRIGGER update_days_updated_at
    BEFORE UPDATE ON days
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on activities
CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate distance_from_hotel when activity location changes
CREATE OR REPLACE FUNCTION auto_calculate_hotel_distance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.location IS NOT NULL THEN
        NEW.distance_from_hotel := calculate_distance_from_hotel(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_hotel_distance
    BEFORE INSERT OR UPDATE OF location ON activities
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_hotel_distance();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Note: Since this is a single-user app, we'll disable RLS
-- If you add auth later, enable these policies

-- Disable RLS for now (single user)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE days ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE remix_links ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (public access)
-- IMPORTANT: In production with auth, replace these with proper policies
CREATE POLICY "Allow all on trips" ON trips FOR ALL USING (true);
CREATE POLICY "Allow all on days" ON days FOR ALL USING (true);
CREATE POLICY "Allow all on activities" ON activities FOR ALL USING (true);
CREATE POLICY "Allow all on remix_links" ON remix_links FOR ALL USING (true);

-- ==========================================
-- HELPER VIEWS
-- ==========================================

-- View: Trips with full details (days + activities)
CREATE OR REPLACE VIEW trips_with_details AS
SELECT
    t.*,
    COUNT(DISTINCT d.id) as day_count,
    COUNT(a.id) as activity_count,
    ST_X(t.hotel_location::geometry) as hotel_lng,
    ST_Y(t.hotel_location::geometry) as hotel_lat
FROM trips t
LEFT JOIN days d ON t.id = d.trip_id
LEFT JOIN activities a ON d.id = a.day_id
GROUP BY t.id;

-- ==========================================
-- SAMPLE DATA (Optional - for testing)
-- ==========================================

-- Insert a sample trip
INSERT INTO trips (title, city, hotel_name, hotel_location, is_public, share_token)
VALUES (
    'Tokyo Adventure',
    'Tokyo',
    'Park Hyatt Tokyo',
    ST_SetSRID(ST_MakePoint(139.691706, 35.685175), 4326)::geography, -- Shinjuku
    true,
    'sample-tokyo-trip-123'
);

-- Get the trip ID
DO $$
DECLARE
    trip_id UUID;
    day1_id UUID;
BEGIN
    SELECT id INTO trip_id FROM trips WHERE title = 'Tokyo Adventure' LIMIT 1;

    -- Insert days
    INSERT INTO days (trip_id, day_number, date)
    VALUES (trip_id, 1, CURRENT_DATE)
    RETURNING id INTO day1_id;

    -- Insert sample activities
    INSERT INTO activities (day_id, order_index, place_name, category, city, location, source, rating)
    VALUES
        (day1_id, 0, 'Senso-ji Temple', 'Sightseeing', 'Tokyo',
         ST_SetSRID(ST_MakePoint(139.796635, 35.714764), 4326)::geography,
         'MANUAL', 4.5),
        (day1_id, 1, 'Tokyo Skytree', 'Sightseeing', 'Tokyo',
         ST_SetSRID(ST_MakePoint(139.810638, 35.710063), 4326)::geography,
         'MANUAL', 4.7);
END $$;

-- ==========================================
-- USEFUL QUERIES (for reference)
-- ==========================================

-- Get all trips with day/activity count
-- SELECT * FROM trips_with_details ORDER BY created_at DESC;

-- Get a trip with all days and activities (nested)
-- SELECT
--   t.*,
--   json_agg(DISTINCT jsonb_build_object(
--     'id', d.id,
--     'day_number', d.day_number,
--     'activities', (
--       SELECT json_agg(jsonb_build_object(
--         'id', a.id,
--         'place_name', a.place_name,
--         'order_index', a.order_index
--       ) ORDER BY a.order_index)
--       FROM activities a WHERE a.day_id = d.id
--     )
--   ) ORDER BY d.day_number) as days
-- FROM trips t
-- LEFT JOIN days d ON t.id = d.trip_id
-- WHERE t.id = 'YOUR_TRIP_ID'
-- GROUP BY t.id;

-- Get activities within 2km of hotel
-- SELECT * FROM get_activities_near_hotel('YOUR_TRIP_ID', 2000);

-- Calculate distance between two points
-- SELECT ST_Distance(
--   ST_SetSRID(ST_MakePoint(139.691706, 35.685175), 4326)::geography, -- Point A
--   ST_SetSRID(ST_MakePoint(139.796635, 35.714764), 4326)::geography  -- Point B
-- ) / 1000.0 as distance_km;
