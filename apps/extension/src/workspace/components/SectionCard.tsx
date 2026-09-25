/**
 * SectionCard — workspace profile section container.
 *
 * Wraps the canonical `.profile-card` + `.profile-card-header` structure that
 * appears 4+ times in ProfileView and once in AnswersView.  Each section has a
 * title, an optional description, and optional header-right actions slot.
 *
 * Usage:
 *   <SectionCard title="Work Experience" description="...">
 *     <form>...</form>
 *   </SectionCard>
 *
 *   <SectionCard title="Skills" headerRight={<button>Save</button>}>
 *     ...
 *   </SectionCard>
 */

interface SectionCardProps {
  title: string;
  description?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  "data-testid"?: string;
}

export function SectionCard({
  title,
  description,
  headerRight,
  children,
  "data-testid": testId,
}: SectionCardProps) {
  return (
    <section className="profile-card" data-testid={testId}>
      <div className="profile-card-header">
        <div>
          <h2 className="profile-card-title">{title}</h2>
          {description && <p className="profile-card-desc">{description}</p>}
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      {children}
    </section>
  );
}
