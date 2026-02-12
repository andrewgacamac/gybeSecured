-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to leads table
CREATE TRIGGER leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Apply to photos table
CREATE TRIGGER photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Function to log status changes to lead_events
CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO lead_events (lead_id, event_type, old_status, new_status, actor_id, details)
        VALUES (
            NEW.id,
            'STATUS_CHANGE',
            OLD.status,
            NEW.status,
            auth.uid(),
            jsonb_build_object('changed_at', now())
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER leads_status_change
    AFTER UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION log_lead_status_change();

-- Function to log lead creation
CREATE OR REPLACE FUNCTION log_lead_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO lead_events (lead_id, event_type, new_status, details)
    VALUES (
        NEW.id,
        'CREATED',
        NEW.status,
        jsonb_build_object(
            'email', NEW.email,
            'created_at', NEW.created_at
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER leads_created
    AFTER INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION log_lead_created();

-- Function to enforce max 5 photos per lead
CREATE OR REPLACE FUNCTION check_photo_limit()
RETURNS TRIGGER AS $$
DECLARE
    photo_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO photo_count
    FROM photos
    WHERE lead_id = NEW.lead_id;

    IF photo_count >= 5 THEN
        RAISE EXCEPTION 'Maximum of 5 photos allowed per lead';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photos_limit_check
    BEFORE INSERT ON photos
    FOR EACH ROW
    EXECUTE FUNCTION check_photo_limit();

-- Function to validate status transitions
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Define valid transitions
    IF OLD.status = 'NEW' AND NEW.status NOT IN ('PROCESSING') THEN
        RAISE EXCEPTION 'Invalid transition from NEW to %', NEW.status;
    END IF;

    IF OLD.status = 'PROCESSING' AND NEW.status NOT IN ('NEEDS_REVIEW', 'FAILED') THEN
        RAISE EXCEPTION 'Invalid transition from PROCESSING to %', NEW.status;
    END IF;

    IF OLD.status = 'FAILED' AND NEW.status NOT IN ('PROCESSING') THEN
        RAISE EXCEPTION 'Invalid transition from FAILED to %', NEW.status;
    END IF;

    IF OLD.status = 'NEEDS_REVIEW' AND NEW.status NOT IN ('APPROVED', 'REJECTED') THEN
        RAISE EXCEPTION 'Invalid transition from NEEDS_REVIEW to %', NEW.status;
    END IF;

    IF OLD.status = 'APPROVED' AND NEW.status NOT IN ('COMPLETED') THEN
        RAISE EXCEPTION 'Invalid transition from APPROVED to %', NEW.status;
    END IF;

    IF OLD.status IN ('COMPLETED', 'REJECTED') THEN
        RAISE EXCEPTION 'Cannot transition from terminal status %', OLD.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_status_validation
    BEFORE UPDATE ON leads
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION validate_status_transition();
