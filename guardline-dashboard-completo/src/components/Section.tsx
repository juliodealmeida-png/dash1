import './section.css'

export default function Section({
  title,
  right,
  children,
}: {
  title: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="section">
      <div className="sectionHeader">
        <div className="sectionTitle">{title}</div>
        <div>{right}</div>
      </div>
      <div className="sectionBody">{children}</div>
    </section>
  )
}

